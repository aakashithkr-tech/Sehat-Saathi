def test_get_all_facilities(client):
    r = client.get("/api/facilities")
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] > 0
    assert len(data["items"]) == data["total"]
    assert "message" in data


def test_get_facilities_by_pincode(client):
    r = client.get("/api/facilities?pincode=201001")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1
    for fac in data["items"]:
        assert fac["pincode"] == "201001"
        assert "directions_url" in fac
        assert "doctor_availability" in fac
        assert "bed_availability" in fac
        assert "DEMO DATA" in fac["source"]


def test_get_facilities_by_pincode_and_type(client):
    r = client.get("/api/facilities?pincode=201001&facility_type=hospital")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1
    for fac in data["items"]:
        assert fac["pincode"] == "201001"
        assert fac["facility_type"] == "hospital"


def test_get_facilities_v1_alias(client):
    r = client.get("/api/v1/facilities?city=delhi")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1
    for fac in data["items"]:
        assert "delhi" in fac["city"].lower() or "delhi" in fac["address"].lower()


def test_get_facilities_no_match(client):
    r = client.get("/api/facilities?pincode=999999")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 0
    assert data["items"] == []
    assert "No healthcare facilities found" in data["message"]
    assert "201001" in data["message"]


def test_get_facilities_invalid_pincode(client):
    r = client.get("/api/facilities?pincode=123")
    assert r.status_code == 422
    assert "valid 6-digit" in r.text


def test_get_facilities_invalid_facility_type(client):
    r = client.get("/api/facilities?facility_type=spaceship")
    assert r.status_code == 422
    assert "Facility type must be one of" in r.text
