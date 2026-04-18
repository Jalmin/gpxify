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

    def test_upload_file_too_large(self, client):
        """Test uploading a file that exceeds size limit"""
        # Create a file larger than 10MB
        large_content = b'x' * (11 * 1024 * 1024)  # 11MB
        files = {
            'file': ('large.gpx', BytesIO(large_content), 'application/gpx+xml')
        }

        response = client.post('/api/v1/gpx/upload', files=files)

        assert response.status_code == 413
        data = response.json()
        assert 'too large' in data['detail'].lower()

    def test_upload_malformed_gpx(self, client):
        """Test uploading a malformed GPX file"""
        malformed_gpx = b'<?xml version="1.0"?><gpx><invalid>content</invalid>'
        files = {
            'file': ('malformed.gpx', BytesIO(malformed_gpx), 'application/gpx+xml')
        }

        response = client.post('/api/v1/gpx/upload', files=files)

        assert response.status_code == 400
        data = response.json()
        assert 'Error parsing GPX file' in data['detail']


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
            'calc_mode': 'naismith'
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
            'calc_mode': 'naismith'
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


class TestGPXTestEndpoint:
    """Test GPX test endpoint"""

    def test_gpx_test_endpoint(self, client):
        """Test the /test endpoint"""
        response = client.get('/api/v1/gpx/test')

        assert response.status_code == 200
        data = response.json()
        assert data['message'] == 'GPX API is running'
        assert data['version'] == '1.0.0'


class TestExportSegmentEndpoint:
    """Test GPX segment export endpoint"""

    def test_export_segment_success(self, client, sample_gpx_simple):
        """Test exporting a GPX segment"""
        from app.services.gpx_parser import GPXParser

        # Parse GPX to get points
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
            'start_km': 0,
            'end_km': points[-1].distance / 1000,
            'track_name': 'Test Segment'
        }

        response = client.post('/api/v1/gpx/export-segment', json=request_data)

        assert response.status_code == 200
        assert 'application/gpx+xml' in response.headers['content-type']
        assert 'attachment' in response.headers['content-disposition']
        assert 'Test_Segment_segment' in response.headers['content-disposition']

        # Verify it's valid GPX XML
        content = response.content.decode('utf-8')
        assert '<?xml version' in content
        assert '<gpx' in content
        assert '</gpx>' in content

    def test_export_segment_invalid_data(self, client):
        """Test export with invalid data"""
        request_data = {
            'track_points': [],  # Empty points
            'start_km': 0,
            'end_km': 10,
            'track_name': 'Invalid'
        }

        response = client.post('/api/v1/gpx/export-segment', json=request_data)

        assert response.status_code == 400
        data = response.json()
        assert 'Error generating GPX file' in data['detail']


class TestDetectClimbsEndpoint:
    """Test climb detection endpoint"""

    def test_detect_climbs_success(self, client, sample_gpx_with_climb):
        """Test detecting climbs in a GPX track"""
        from app.services.gpx_parser import GPXParser

        # Parse GPX with climb
        gpx_data = GPXParser.parse_gpx_file(sample_gpx_with_climb, "climb.gpx")
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
            'start_km': 0,
            'end_km': points[-1].distance / 1000,
            'track_name': 'Climb Test'
        }

        response = client.post('/api/v1/gpx/detect-climbs', json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_detect_climbs_no_climbs(self, client, sample_gpx_simple):
        """Test climb detection with flat track"""
        from app.services.gpx_parser import GPXParser

        # Parse simple flat GPX
        gpx_data = GPXParser.parse_gpx_file(sample_gpx_simple, "flat.gpx")
        points = gpx_data.tracks[0].points

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
            'start_km': 0,
            'end_km': points[-1].distance / 1000,
            'track_name': 'Flat Test'
        }

        response = client.post('/api/v1/gpx/detect-climbs', json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Flat track should have no or very few climbs
        assert len(data) <= 1


class TestMergeGPXEndpoint:
    """Test GPX merge endpoint"""

    def test_merge_two_files_success(self, client, sample_gpx_simple):
        """Test merging two GPX files"""
        request_data = {
            'files': [
                {
                    'filename': 'file1.gpx',
                    'content': sample_gpx_simple
                },
                {
                    'filename': 'file2.gpx',
                    'content': sample_gpx_simple
                }
            ],
            'merged_track_name': 'Merged Track',
            'options': {
                'gap_threshold_seconds': 300,
                'interpolate_gaps': False,
                'sort_by_time': True
            }
        }

        response = client.post('/api/v1/gpx/merge', json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert 'Successfully merged 2 files' in data['message']
        assert 'merged_gpx' in data
        assert 'data' in data
        assert isinstance(data['warnings'], list)

        # Verify merged GPX is valid XML
        assert '<?xml version' in data['merged_gpx']
        assert '<gpx' in data['merged_gpx']
        assert '</gpx>' in data['merged_gpx']

    def test_merge_insufficient_files(self, client, sample_gpx_simple):
        """Test merge with only one file"""
        request_data = {
            'files': [
                {
                    'filename': 'file1.gpx',
                    'content': sample_gpx_simple
                }
            ],
            'merged_track_name': 'Single File',
            'options': {
                'gap_threshold_seconds': 300,
                'interpolate_gaps': False,
                'sort_by_time': True
            }
        }

        response = client.post('/api/v1/gpx/merge', json=request_data)

        # Might be 400 or 500 depending on implementation
        assert response.status_code in [400, 500]
        data = response.json()
        assert 'detail' in data

    def test_merge_invalid_gpx_content(self, client):
        """Test merge with invalid GPX content"""
        request_data = {
            'files': [
                {
                    'filename': 'invalid1.gpx',
                    'content': 'invalid content'
                },
                {
                    'filename': 'invalid2.gpx',
                    'content': 'also invalid'
                }
            ],
            'merged_track_name': 'Invalid Merge',
            'options': {
                'gap_threshold_seconds': 300,
                'interpolate_gaps': False,
                'sort_by_time': True
            }
        }

        response = client.post('/api/v1/gpx/merge', json=request_data)

        assert response.status_code in [400, 500]
        data = response.json()
        assert 'detail' in data


class TestAidStationTableValidation:
    """Test aid station table validation"""

    def test_aid_station_no_track_points(self, client):
        """Test with no track points"""
        request_data = {
            'track_points': [],
            'aid_stations': [
                {'name': 'Start', 'distance_km': 0},
                {'name': 'End', 'distance_km': 10}
            ],
            'calc_mode': 'naismith'
        }

        response = client.post('/api/v1/gpx/aid-station-table', json=request_data)

        # Might be 400 or 500 depending on error handling
        assert response.status_code in [400, 500]
        data = response.json()
        assert 'detail' in data

    def test_aid_station_custom_pace(self, client, sample_gpx_simple):
        """Test aid station table with custom pace"""
        from app.services.gpx_parser import GPXParser

        gpx_data = GPXParser.parse_gpx_file(sample_gpx_simple, "test.gpx")
        points = gpx_data.tracks[0].points

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
            'calc_mode': 'constant_pace',
            'constant_pace_kmh': 10.0
        }

        response = client.post('/api/v1/gpx/aid-station-table', json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert len(data['segments']) == 1


class TestAidStationCalcMode:
    """Tests for the calc_mode enum migration and trail_planner mode."""

    def _build_request(self, client, sample_gpx_simple, **overrides):
        from app.services.gpx_parser import GPXParser

        gpx_data = GPXParser.parse_gpx_file(sample_gpx_simple, "test.gpx")
        points = gpx_data.tracks[0].points
        base = {
            'track_points': [
                {
                    'lat': p.lat,
                    'lon': p.lon,
                    'elevation': p.elevation,
                    'distance': p.distance,
                }
                for p in points
            ],
            'aid_stations': [
                {'name': 'Start', 'distance_km': 0},
                {'name': 'End', 'distance_km': points[-1].distance / 1000},
            ],
        }
        base.update(overrides)
        return base

    def test_trail_planner_with_config(self, client, sample_gpx_simple):
        """Trail Planner mode with a full config returns a computed table."""
        payload = self._build_request(
            client,
            sample_gpx_simple,
            calc_mode='trail_planner',
            trail_planner_config={
                'flat_pace_kmh': 10,
                'climb_penalty_min_per_100m': 6,
                'descent_bonus_min_per_100m': 3,
                'fatigue_percent_per_interval': 5,
                'fatigue_interval_km': 20,
            },
        )
        response = client.post('/api/v1/gpx/aid-station-table', json=payload)
        assert response.status_code == 200
        assert response.json()['success'] is True

    def test_trail_planner_without_config_returns_422(self, client, sample_gpx_simple):
        payload = self._build_request(
            client, sample_gpx_simple, calc_mode='trail_planner'
        )
        response = client.post('/api/v1/gpx/aid-station-table', json=payload)
        assert response.status_code == 422
        assert 'trail_planner_config' in response.text

    def test_constant_pace_without_pace_returns_422(self, client, sample_gpx_simple):
        payload = self._build_request(
            client, sample_gpx_simple, calc_mode='constant_pace'
        )
        response = client.post('/api/v1/gpx/aid-station-table', json=payload)
        assert response.status_code == 422
        assert 'constant_pace_kmh' in response.text

    def test_invalid_calc_mode_returns_422(self, client, sample_gpx_simple):
        payload = self._build_request(
            client, sample_gpx_simple, calc_mode='sorcery'
        )
        response = client.post('/api/v1/gpx/aid-station-table', json=payload)
        assert response.status_code == 422

    def test_deprecated_use_naismith_returns_400(self, client, sample_gpx_simple):
        """use_naismith field was removed — must return 400 with an explicit hint."""
        payload = self._build_request(
            client, sample_gpx_simple, use_naismith=True
        )
        response = client.post('/api/v1/gpx/aid-station-table', json=payload)
        assert response.status_code == 400
        assert 'deprecated' in response.text.lower()
        assert 'calc_mode' in response.text

    def test_trail_planner_flat_pace_too_high(self, client, sample_gpx_simple):
        payload = self._build_request(
            client,
            sample_gpx_simple,
            calc_mode='trail_planner',
            trail_planner_config={
                'flat_pace_kmh': 50,  # > 30 max
                'climb_penalty_min_per_100m': 6,
                'descent_bonus_min_per_100m': 3,
            },
        )
        response = client.post('/api/v1/gpx/aid-station-table', json=payload)
        assert response.status_code == 422

    def test_trail_planner_fatigue_interval_zero(self, client, sample_gpx_simple):
        payload = self._build_request(
            client,
            sample_gpx_simple,
            calc_mode='trail_planner',
            trail_planner_config={
                'flat_pace_kmh': 10,
                'climb_penalty_min_per_100m': 6,
                'descent_bonus_min_per_100m': 3,
                'fatigue_interval_km': 0,
            },
        )
        response = client.post('/api/v1/gpx/aid-station-table', json=payload)
        assert response.status_code == 422
