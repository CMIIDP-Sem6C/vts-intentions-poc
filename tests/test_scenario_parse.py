import json

from api.scenario_parse import (
    parse_json_value,
    parse_latlng_route,
    parse_start_coordinate,
)


def test_parse_start_coordinate_json_string():
    raw = json.dumps([51.9164, 4.493])
    assert parse_start_coordinate(raw) == [51.9164, 4.493]


def test_parse_latlng_route():
    raw = "[[51,4],[52,5]]"
    assert parse_latlng_route(raw) == [[51.0, 4.0], [52.0, 5.0]]


def test_parse_json_value_list():
    assert parse_json_value([1, 2]) == [1, 2]


def test_lenient_operator_notes():
    js_like = """[
      { channel: 'VHF60', location: 'Waalhaven', time: '10m', note: 'Test.' }
    ]"""
    out = parse_json_value(js_like)
    assert isinstance(out, list)
    assert out[0]["channel"] == "VHF60"
