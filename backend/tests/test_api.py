"""
Integration tests for API endpoints
"""
import pytest
from io import BytesIO


class TestGPXUploadEndpoint:
    """Test GPX upload endpoint"""

    def test_upload_valid_gpx(self, client, sample_gpx_simple):
        """Test uploading a valid GPX file"""
        files = {
            'file': ('test.gpx', BytesIO(sample_gpx_simple.encode()), 'application/gpx+xml')
        }

        response = client.post('/api/v1/gpx/upload', files=files)

        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert 'data' in data
        assert len(data['data']['tracks']) == 1

    def test_upload_invalid_file(self, client):
        """Test uploading an invalid file"""
        files = {
            'file': ('test.txt', BytesIO(b'not a gpx file'), 'text/plain')
        }

        response = client.post('/api/v1/gpx/upload', files=files)

        assert response.status_code == 400

    def test_upload_no_file(self, client):
        """Test uploading without a file"""
        response = client.post('/api/v1/gpx/upload')

        assert response.status_code == 422  # Validation error


class TestAidStationTableEndpoint:
    """Test aid station table generation endpoint"""

    def test_generate_table(self, client, sample_gpx_simple):
        """Test generating an aid station table"""
        # First parse GPX to get points
        from app.services.gpx_parser import GPXParser
        from app.models.gpx import TrackPoint, AidStation

        gpx_data = GPXParser.parse_gpx_file(sample_gpx_simple, "test.gpx")
        points = gpx_data.tracks[0].points

        # Prepare request
        request_data = {
            'track_points': [
                {
                    'lat': p.lat,
                    'lon': p.lon,
                    'elevation': p.elevation,
                    'distance': p.distance
                }
                for p in points
            ],
            'aid_stations': [
                {'name': 'Start', 'distance_km': 0},
                {'name': 'End', 'distance_km': points[-1].distance / 1000}
            ],
            'use_naismith': True
        }

        response = client.post('/api/v1/gpx/aid-station-table', json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert len(data['segments']) == 1
        assert 'total_distance_km' in data

    def test_insufficient_aid_stations(self, client):
        """Test with insufficient aid stations"""
        request_data = {
            'track_points': [
                {'lat': 45.0, 'lon': 6.0, 'elevation': 1000, 'distance': 0}
            ],
            'aid_stations': [
                {'name': 'Only One', 'distance_km': 0}
            ],
            'use_naismith': True
        }

        response = client.post('/api/v1/gpx/aid-station-table', json=request_data)

        # Should return error (500 currently, should be 400 in future)
        assert response.status_code in [400, 500]


class TestHealthEndpoint:
    """Test health check endpoint"""

    def test_health_check(self, client):
        """Test health endpoint"""
        response = client.get('/health')

        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'healthy'
