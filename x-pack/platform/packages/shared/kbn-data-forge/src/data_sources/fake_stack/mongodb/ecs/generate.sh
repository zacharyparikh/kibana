#!/bin/sh

cd ../../../../../../../../../../../ecs
NAME=mongodb

BASE=../kibana/x-pack/platform/packages/shared/kbn-data-forge/src/data_sources/fake_stack/$NAME
ECS=$BASE/ecs

python3 ./scripts/generator.py --ref v8.0.0 \
  --subset                   $ECS/fields/subset.yml \
  --include                  $ECS/fields/custom \
  --out                      $ECS/ \
  --template-settings-legacy $ECS/fields/template-settings-legacy.json \
  --template-settings        $ECS/fields/template-settings.json \
  --mapping-settings         $ECS/fields/mapping-settings.json

