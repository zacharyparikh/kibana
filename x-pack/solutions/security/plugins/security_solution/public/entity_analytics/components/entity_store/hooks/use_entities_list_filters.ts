/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { useMemo } from 'react';
import {
  ASSET_CRITICALITY_INDEX_PATTERN,
  RISK_SCORE_INDEX_PATTERN,
  type CriticalityLevels,
} from '../../../../../common/constants';
import {
  EntityTypeToLevelField,
  RiskScoreFields,
  type RiskSeverity,
} from '../../../../../common/search_strategy';
import { useGlobalFilterQuery } from '../../../../common/hooks/use_global_filter_query';
import { EntitySourceTag } from '../types';
import { useEntityStoreTypes } from '../../../hooks/use_enabled_entity_types';

interface UseEntitiesListFiltersParams {
  selectedSeverities: RiskSeverity[];
  selectedCriticalities: CriticalityLevels[];
  selectedSources: EntitySourceTag[];
}

export const useEntitiesListFilters = ({
  selectedSeverities,
  selectedCriticalities,
  selectedSources,
}: UseEntitiesListFiltersParams) => {
  const { filterQuery: globalQuery } = useGlobalFilterQuery();
  const enabledEntityTypes = useEntityStoreTypes();

  return useMemo(() => {
    const criticalityFilter: QueryDslQueryContainer[] = selectedCriticalities.length
      ? [
          {
            bool: {
              should: selectedCriticalities.map((value) => ({
                term: {
                  'asset.criticality': value,
                },
              })),
            },
          },
        ]
      : [];

    const sourceFilter: QueryDslQueryContainer[] = selectedSources.length
      ? [
          {
            bool: {
              should: selectedSources.map((tag) => getSourceTagFilterQuery(tag)),
            },
          },
        ]
      : [];

    const severityFilter: QueryDslQueryContainer[] = selectedSeverities.length
      ? [
          {
            bool: {
              should: enabledEntityTypes
                .filter((type) => {
                  return EntityTypeToLevelField[type] !== RiskScoreFields.unsupported;
                })
                .map((type) => ({
                  terms: {
                    [EntityTypeToLevelField[type]]: selectedSeverities,
                  },
                })),
            },
          },
        ]
      : [];

    const filterList: QueryDslQueryContainer[] = [
      ...severityFilter,
      ...criticalityFilter,
      ...sourceFilter,
    ];
    if (globalQuery) {
      filterList.push(globalQuery);
    }
    return filterList;
  }, [enabledEntityTypes, globalQuery, selectedCriticalities, selectedSeverities, selectedSources]);
};

const getSourceTagFilterQuery = (tag: EntitySourceTag): QueryDslQueryContainer => {
  if (tag === EntitySourceTag.risk) {
    return {
      wildcard: {
        'entity.source': RISK_SCORE_INDEX_PATTERN,
      },
    };
  }
  if (tag === EntitySourceTag.criticality) {
    return {
      wildcard: {
        'entity.source': ASSET_CRITICALITY_INDEX_PATTERN,
      },
    };
  }

  return {
    bool: {
      must_not: [
        {
          wildcard: {
            'entity.source': ASSET_CRITICALITY_INDEX_PATTERN,
          },
        },
        {
          wildcard: {
            'entity.source': RISK_SCORE_INDEX_PATTERN,
          },
        },
      ],
    },
  };
};
