#!/bin/sh
# Natural Earth 1:50m katmanlarını veri/ klasörüne indirir.
set -e
cd "$(dirname "$0")"; mkdir -p veri
for f in ne_50m_admin_0_countries ne_50m_lakes ne_50m_rivers_lake_centerlines; do
  [ -f "veri/$f.geojson" ] || curl -sSfL -o "veri/$f.geojson" \
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/$f.geojson"
done
