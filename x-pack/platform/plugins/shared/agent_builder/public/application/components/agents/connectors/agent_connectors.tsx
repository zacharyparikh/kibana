/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { ToolSelection } from '@kbn/agent-builder-common';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { ConnectorItem } from '../../../../../common/http_api/tools';
import { labels } from '../../../utils/i18n';
import { appPaths } from '../../../utils/app_paths';
import { useNavigation } from '../../../hooks/use_navigation';
import { useConnectorsService } from '../../../hooks/connectors/use_connectors';
import { useToolsService } from '../../../hooks/tools/use_tools';
import { useAgentBuilderAgentById } from '../../../hooks/agents/use_agent_by_id';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useToasts } from '../../../hooks/use_toasts';
import { queryKeys } from '../../../query_keys';
import { useFlyoutState } from '../../../hooks/use_flyout_state';
import {
  getAgentConnectorIds,
  addConnectorTools,
  removeConnectorTools,
} from '../../../utils/connector_selection_utils';
import { ActiveItemRow } from '../common/active_item_row';
import { ConnectorLibraryPanel } from './connector_library_panel';
import { ConnectorDetailPanel } from './connector_detail_panel';
import { PageWrapper } from '../common/page_wrapper';
import { ICON_DIMENSIONS } from '../common/constants';
import { useListDetailPageStyles } from '../common/styles';

const ActiveConnectorsList: React.FC<{
  filteredActiveConnectors: ConnectorItem[];
  searchQuery: string;
  selectedConnectorId: string | null;
  isRemoving: boolean;
  onSelect: (id: string) => void;
  onRemove: (connector: ConnectorItem) => void;
}> = ({
  filteredActiveConnectors,
  searchQuery,
  selectedConnectorId,
  isRemoving,
  onSelect,
  onRemove,
}) => {
  if (filteredActiveConnectors.length === 0) {
    return (
      <EuiText size="s" color="subdued" textAlign="center">
        <p>
          {searchQuery.trim()
            ? labels.agentConnectors.noActiveConnectorsMatchMessage
            : labels.agentConnectors.noActiveConnectorsMessage}
        </p>
      </EuiText>
    );
  }

  return (
    <>
      {filteredActiveConnectors.map((connector) => {
        return (
          <ActiveItemRow
            key={connector.id}
            id={connector.id}
            name={connector.name}
            isSelected={selectedConnectorId === connector.id}
            onSelect={() => onSelect(connector.id)}
            onRemove={() => onRemove(connector)}
            isRemoving={isRemoving}
            removeAriaLabel={labels.agentConnectors.removeConnectorAriaLabel}
          />
        );
      })}
    </>
  );
};

export const AgentConnectors: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const styles = useListDetailPageStyles();
  const { createAgentBuilderUrl } = useNavigation();
  const { agentService } = useAgentBuilderServices();
  const { addSuccessToast, addErrorToast } = useToasts();
  const queryClient = useQueryClient();

  const { agent, isLoading: agentLoading } = useAgentBuilderAgentById(agentId);
  const { connectors: allConnectors, isLoading: connectorsLoading } = useConnectorsService();
  const { tools: allTools, isLoading: toolsLoading } = useToolsService();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [mutatingConnectorId, setMutatingConnectorId] = useState<string | null>(null);
  const {
    isOpen: isLibraryOpen,
    openFlyout: openLibrary,
    closeFlyout: closeLibrary,
  } = useFlyoutState();

  const agentToolSelections = useMemo(
    () => agent?.configuration?.tools ?? [],
    [agent?.configuration?.tools]
  );

  // Derive active connectors from the agent's selected tools
  const agentConnectorIds = useMemo(
    () => getAgentConnectorIds(allTools, agentToolSelections),
    [allTools, agentToolSelections]
  );

  const activeConnectors = useMemo(
    () => (agent ? allConnectors.filter((c) => agentConnectorIds.has(c.id)) : []),
    [allConnectors, agentConnectorIds, agent]
  );

  const activeConnectorIdSet = useMemo(
    () => new Set(activeConnectors.map((c) => c.id)),
    [activeConnectors]
  );

  useEffect(() => {
    if (!selectedConnectorId) {
      if (activeConnectors.length > 0) {
        setSelectedConnectorId(activeConnectors[0].id);
      }
    } else {
      const stillActive = activeConnectors.some((c) => c.id === selectedConnectorId);
      if (!stillActive) {
        setSelectedConnectorId(activeConnectors[0]?.id ?? null);
      }
    }
  }, [activeConnectors, selectedConnectorId]);

  const filteredActiveConnectors = useMemo(() => {
    if (!searchQuery.trim()) return activeConnectors;
    const lower = searchQuery.toLowerCase();
    return activeConnectors.filter((c) => c.name.toLowerCase().includes(lower));
  }, [activeConnectors, searchQuery]);

  const updateToolsMutation = useMutation({
    mutationFn: (newToolSelections: ToolSelection[]) => {
      return agentService.update(agentId!, { configuration: { tools: newToolSelections } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.byId(agentId) });
    },
    onError: () => {
      addErrorToast({ title: labels.agentConnectors.updateConnectorsErrorToast });
    },
  });

  const handleAddConnector = useCallback(
    async (connector: ConnectorItem) => {
      if (agentConnectorIds.has(connector.id)) return;
      const newSelections = addConnectorTools(connector.id, allTools, agentToolSelections);
      setMutatingConnectorId(connector.id);
      try {
        await updateToolsMutation.mutateAsync(newSelections);
        addSuccessToast({
          title: labels.agentConnectors.addConnectorSuccessToast(connector.name),
        });
      } finally {
        setMutatingConnectorId(null);
      }
    },
    [agentConnectorIds, allTools, agentToolSelections, updateToolsMutation, addSuccessToast]
  );

  const handleRemoveConnector = useCallback(
    (connector: ConnectorItem) => {
      const newSelections = removeConnectorTools(connector.id, allTools, agentToolSelections);
      setMutatingConnectorId(connector.id);
      updateToolsMutation.mutate(newSelections, {
        onSuccess: () => {
          setSelectedConnectorId(null);
          addSuccessToast({
            title: labels.agentConnectors.removeConnectorSuccessToast(connector.name),
          });
        },
        onSettled: () => setMutatingConnectorId(null),
      });
    },
    [allTools, agentToolSelections, updateToolsMutation, addSuccessToast]
  );

  const handleToggleConnector = useCallback(
    (connector: ConnectorItem, isActive: boolean) => {
      if (isActive) {
        handleAddConnector(connector);
      } else {
        handleRemoveConnector(connector);
      }
    },
    [handleAddConnector, handleRemoveConnector]
  );

  const handleRemoveSelectedConnector = useCallback(() => {
    if (!selectedConnectorId) return;
    const connector = activeConnectors.find((c) => c.id === selectedConnectorId);
    if (connector) {
      handleRemoveConnector(connector);
    }
  }, [selectedConnectorId, activeConnectors, handleRemoveConnector]);

  const isLoading = agentLoading || connectorsLoading || toolsLoading;

  if (isLoading) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" css={styles.loadingSpinner}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexGroup>
    );
  }

  return (
    <PageWrapper>
      <div css={styles.header}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon type="plugs" aria-hidden={true} css={ICON_DIMENSIONS} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="l">
                  <h1>{labels.connectors.title}</h1>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty href={createAgentBuilderUrl(appPaths.manage.connectors)}>
                  {labels.agentConnectors.manageAllConnectors}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill iconType="plusInCircle" iconSide="left" onClick={openLibrary}>
                  {labels.agentConnectors.addConnectorButton}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {labels.agentConnectors.pageDescription}
        </EuiText>
      </div>

      <EuiFlexGroup gutterSize="none" responsive={false} css={styles.body}>
        <EuiFlexItem grow={false} css={styles.searchColumn}>
          <div css={styles.searchInputWrapper}>
            <EuiFieldSearch
              placeholder={labels.agentConnectors.searchActiveConnectorsPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              incremental
              fullWidth
            />
          </div>

          <div css={styles.scrollableList}>
            <ActiveConnectorsList
              filteredActiveConnectors={filteredActiveConnectors}
              searchQuery={searchQuery}
              selectedConnectorId={selectedConnectorId}
              isRemoving={updateToolsMutation.isLoading}
              onSelect={setSelectedConnectorId}
              onRemove={handleRemoveConnector}
            />
          </div>
        </EuiFlexItem>

        <EuiFlexItem css={styles.detailPanelWrapper}>
          {selectedConnectorId ? (
            <ConnectorDetailPanel
              connectorId={selectedConnectorId}
              onRemove={handleRemoveSelectedConnector}
            />
          ) : (
            <EuiFlexGroup
              justifyContent="center"
              alignItems="center"
              css={styles.noSelectionPlaceholder}
            >
              <EuiText size="s" color="subdued">
                {labels.agentConnectors.noConnectorSelectedMessage}
              </EuiText>
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>

      {isLibraryOpen && (
        <ConnectorLibraryPanel
          onClose={closeLibrary}
          allConnectors={allConnectors}
          activeConnectorIdSet={activeConnectorIdSet}
          onToggleConnector={handleToggleConnector}
          mutatingConnectorId={mutatingConnectorId}
        />
      )}
    </PageWrapper>
  );
};
