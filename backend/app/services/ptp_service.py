"""
PTP (Profile to Print) Service
Handles ravito table parsing with Claude API and sun times fetching
"""
from typing import List
import logging
import json
import httpx

from app.models.ptp import ParsedRavitoTable, ParsedRavito, SunTimes
from app.models.race import RavitoType

logger = logging.getLogger(__name__)


class PTPService:
    """Service for PTP feature functionality"""

    SUNRISE_SUNSET_API = "https://api.sunrise-sunset.org/json"

    @staticmethod
    async def parse_ravito_table_with_claude(
        raw_text: str,
        anthropic_api_key: str
    ) -> ParsedRavitoTable:
        """
        Parse raw ravito table text using Claude API

        Args:
            raw_text: User-pasted text from race organization
            anthropic_api_key: Anthropic API key

        Returns:
            Structured ParsedRavitoTable
        """
        try:
            import anthropic

            client = anthropic.Anthropic(api_key=anthropic_api_key)

            prompt = f"""Tu es un expert en courses de trail. Parse le tableau suivant des ravitaillements.

Extrais chaque ravitaillement avec:
- name: Le nom du point de ravitaillement
- distance_km: Distance en kilomètres depuis le départ (nombre décimal)
- type: Un parmi "eau" (eau uniquement), "bouffe" (nourriture/solide disponible), "assistance" (assistance autorisée)
- services: Liste des services disponibles (ex: ["eau", "boissons", "solide", "assistance", "douche", "lits"])

Règles pour déterminer le type:
- "eau" = uniquement eau/boissons, pas de nourriture solide
- "bouffe" = nourriture solide disponible (barres, gels, soupes, pâtes, etc.)
- "assistance" = l'assistance personnelle est autorisée à ce point

Retourne UNIQUEMENT du JSON valide dans ce format exact:
{{
  "ravitos": [
    {{"name": "...", "distance_km": 0.0, "type": "eau|bouffe|assistance", "services": ["..."]}}
  ],
  "race_name": "..." (si détecté),
  "total_distance": 0.0 (si détecté)
}}

Texte à parser:
{raw_text}
"""

            message = client.messages.create(
                model="claude-3-haiku-20240307",  # Fast and cheap for parsing
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = message.content[0].text

            # Extract JSON from response
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1

            if json_start == -1 or json_end == 0:
                raise ValueError("No valid JSON found in response")

            json_str = response_text[json_start:json_end]
            data = json.loads(json_str)

            # Convert to Pydantic models
            ravitos = []
            for r in data.get("ravitos", []):
                type_str = r.get("type", "bouffe")
                try:
                    ravito_type = RavitoType(type_str)
                except ValueError:
                    ravito_type = RavitoType.BOUFFE

                ravitos.append(ParsedRavito(
                    name=r["name"],
                    distance_km=float(r["distance_km"]),
                    type=ravito_type,
                    services=r.get("services")
                ))

            return ParsedRavitoTable(
                ravitos=ravitos,
                race_name=data.get("race_name"),
                total_distance=data.get("total_distance")
            )

        except ImportError:
            logger.error("anthropic package not installed")
            raise ValueError("Anthropic package not installed. Run: pip install anthropic")

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude response as JSON: {e}")
            raise ValueError(f"Failed to parse response: {e}")

        except Exception as e:
            logger.error(f"Error parsing ravito table with Claude: {e}")
            raise

    @staticmethod
    async def get_sun_times(
        lat: float,
        lon: float,
        dates: List[str]
    ) -> List[SunTimes]:
        """
        Get sunrise/sunset times from sunrise-sunset.org API

        Args:
            lat: Latitude
            lon: Longitude
            dates: List of ISO date strings (YYYY-MM-DD)

        Returns:
            List of SunTimes for each date
        """
        sun_times = []

        async with httpx.AsyncClient() as client:
            for date in dates:
                try:
                    response = await client.get(
                        PTPService.SUNRISE_SUNSET_API,
                        params={
                            "lat": lat,
                            "lng": lon,
                            "date": date,
                            "formatted": 0  # Get ISO format
                        },
                        timeout=10.0
                    )

                    if response.status_code == 200:
                        data = response.json()
                        if data.get("status") == "OK":
                            results = data["results"]
                            sun_times.append(SunTimes(
                                sunrise=results["sunrise"],
                                sunset=results["sunset"],
                                civil_twilight_begin=results["civil_twilight_begin"],
                                civil_twilight_end=results["civil_twilight_end"],
                                date=date
                            ))
                        else:
                            logger.warning(f"Sun times API returned status: {data.get('status')}")
                    else:
                        logger.warning(f"Sun times API returned HTTP {response.status_code}")

                except httpx.TimeoutException:
                    logger.warning(f"Timeout fetching sun times for {date}")
                except Exception as e:
                    logger.error(f"Error fetching sun times for {date}: {e}")
                    continue

        return sun_times
