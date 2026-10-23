def ids(r):
    return {i["id"] for i in r.json()["items"]}


def test_empty_database(client):
    r = client.get("/api/v1/resources")
    assert r.status_code == 200
    assert r.json() == {"items": [], "total": 0, "page": 1, "page_size": 50, "pages": 1}
    assert client.get("/api/v1/resources/categories").json() == []


def test_listing_excludes_inactive(client, seeded):
    r = client.get("/api/v1/resources")
    assert r.json()["total"] == 4
    assert "r4" not in ids(r)


def test_filter_by_kind_category_language(client, seeded):
    assert ids(client.get("/api/v1/resources", params={"kind": "care"})) == {"r3", "r5"}
    assert ids(client.get("/api/v1/resources", params={"category": "hygiene"})) == {"r1", "r2"}
    assert ids(client.get("/api/v1/resources", params={"language": "hi"})) == {"r2"}
    assert ids(client.get("/api/v1/resources", params={"kind": "information", "language": "en"})) == {"r1"}


def test_search(client, seeded):
    assert ids(client.get("/api/v1/resources", params={"search": "WATER"})) == {"r2"}
    assert ids(client.get("/api/v1/resources", params={"search": "zzz-nothing"})) == set()
    # SQL wildcards are matched literally, not as patterns
    assert ids(client.get("/api/v1/resources", params={"search": "%"})) == set()
    assert client.get("/api/v1/resources", params={"search": "x'; DROP TABLE resources;--"}).status_code == 200
    assert client.get("/api/v1/resources").json()["total"] == 4


def test_pagination(client, seeded):
    p1 = client.get("/api/v1/resources", params={"page_size": 3}).json()
    p2 = client.get("/api/v1/resources", params={"page_size": 3, "page": 2}).json()
    assert (p1["total"], p1["pages"], len(p1["items"]), len(p2["items"])) == (4, 2, 3, 1)
    assert {i["id"] for i in p1["items"]}.isdisjoint({i["id"] for i in p2["items"]})


def test_invalid_params(client):
    assert client.get("/api/v1/resources", params={"kind": "bogus"}).status_code == 422
    assert client.get("/api/v1/resources", params={"page": 0}).status_code == 422
    assert client.get("/api/v1/resources", params={"page_size": 1000}).status_code == 422


def test_detail_and_404(client, seeded):
    r = client.get("/api/v1/resources/r3")
    assert r.status_code == 200 and r.json()["title"] == "Test clinic"
    assert client.get("/api/v1/resources/nope").status_code == 404
    assert client.get("/api/v1/resources/r4").status_code == 404  # inactive


def test_categories_not_shadowed_by_id_route(client, seeded):
    r = client.get("/api/v1/resources/categories")
    assert r.status_code == 200
    assert {c["name"]: c["count"] for c in r.json()} == {"Clinic": 2, "Hygiene": 2}
    assert [c["name"] for c in client.get("/api/v1/resources/categories", params={"kind": "care"}).json()] == ["Clinic"]


def test_unsafe_urls_are_dropped(client, seeded):
    assert client.get("/api/v1/resources/r5").json()["url"] is None
    assert client.get("/api/v1/resources/r3").json()["url"] == "https://example.org/x"
