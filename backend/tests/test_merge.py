#!/usr/bin/env python3
"""
Test script for GPX merge functionality
"""
import sys
sys.path.insert(0, '/Users/loicjalmin/Projects/GPXIFY/backend')

from app.services.gpx_parser import GPXParser

# Read test GPX files
with open('/Users/loicjalmin/Projects/GPXIFY/test_merge_part1.gpx', 'r') as f:
    gpx1_content = f.read()

with open('/Users/loicjalmin/Projects/GPXIFY/test_merge_part2.gpx', 'r') as f:
    gpx2_content = f.read()

print("=" * 60)
print("Testing GPX Merge Functionality")
print("=" * 60)

# Test merge
files_content = [
    ('test_merge_part1.gpx', gpx1_content),
    ('test_merge_part2.gpx', gpx2_content)
]

print("\n📁 Merging 2 GPX files...")
print(f"  - File 1: test_merge_part1.gpx")
print(f"  - File 2: test_merge_part2.gpx")

try:
    merged_gpx, warnings = GPXParser.merge_gpx_files(
        files_content=files_content,
        gap_threshold_seconds=300,
        interpolate_gaps=True,
        sort_by_time=True,
        merged_track_name="Test Merged Track"
    )

    print("\n✅ Merge successful!")
    print(f"\n📊 Warnings/Info ({len(warnings)}):")
    for i, warning in enumerate(warnings, 1):
        print(f"  {i}. {warning}")

    # Get statistics
    merged_xml = merged_gpx.to_xml()
    print(f"\n📈 Merged GPX size: {len(merged_xml)} characters")

    # Parse the merged GPX to get stats
    merged_data = GPXParser.parse_gpx_file(merged_xml, "merged_test.gpx")

    if merged_data.tracks:
        track = merged_data.tracks[0]
        stats = track.statistics
        print(f"\n📍 Track Statistics:")
        print(f"  - Total distance: {stats.total_distance:.2f} m ({stats.total_distance/1000:.2f} km)")
        print(f"  - Elevation gain: {stats.total_elevation_gain:.1f} m")
        print(f"  - Elevation loss: {stats.total_elevation_loss:.1f} m")
        print(f"  - Max elevation: {stats.max_elevation:.1f} m" if stats.max_elevation else "  - Max elevation: N/A")
        print(f"  - Min elevation: {stats.min_elevation:.1f} m" if stats.min_elevation else "  - Min elevation: N/A")
        print(f"  - Total points: {len(track.points)}")

    # Save merged file
    output_path = '/Users/loicjalmin/Projects/GPXIFY/test_merge_output.gpx'
    with open(output_path, 'w') as f:
        f.write(merged_xml)
    print(f"\n💾 Merged GPX saved to: {output_path}")

    print("\n" + "=" * 60)
    print("✅ TEST PASSED!")
    print("=" * 60)

except Exception as e:
    print(f"\n❌ Error during merge: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
