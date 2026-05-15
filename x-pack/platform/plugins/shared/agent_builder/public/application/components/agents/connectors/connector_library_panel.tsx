/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { ConnectorItem } from '../../../../../common/http_api/tools';
import { labels } from '../../../utils/i18n';
import { appPaths } from '../../../utils/app_paths';
import { LibraryPanel } from '../common/library_panel';
import type { LibraryPanelLabels } from '../common/library_panel';

const libraryLabels: LibraryPanelLabels = {
  title: labels.agentConnectors.addConnectorFromLibraryTitle,
  manageLibraryLink: labels.agentConnectors.manageConnectorLibraryLink,
  searchPlaceholder: labels.agentConnectors.searchAvailableConnectorsPlaceholder,
  availableSummary: labels.agentConnectors.availableConnectorsSummary,
  noMatchMessage: labels.agentConnectors.noAvailableConnectorsMatchMessage,
  noItemsMessage: labels.agentConnectors.noAvailableConnectorsMessage,
};

interface ConnectorLibraryItem {
  id: string;
  description: string;
  name: string;
}

interface ConnectorLibraryPanelProps {
  onClose: () => void;
  allConnectors: readonly ConnectorItem[];
  activeConnectorIdSet: Set<string>;
  onToggleConnector: (connector: ConnectorItem, isActive: boolean) => void;
  mutatingConnectorId: string | null;
}

const getItemName = (item: ConnectorLibraryItem): string => item.name;

const getSearchableText = (item: ConnectorLibraryItem): string[] => [item.name, item.description];

export const ConnectorLibraryPanel: React.FC<ConnectorLibraryPanelProps> = ({
  onClose,
  allConnectors,
  activeConnectorIdSet,
  onToggleConnector,
  mutatingConnectorId,
}) => {
  // Map ConnectorItem to LibraryItem shape (requires description field)
  const libraryItems = useMemo(
    () =>
      allConnectors.map((connector) => ({
        id: connector.id,
        name: connector.name,
        description: connector.name,
      })),
    [allConnectors]
  );

  // Build a lookup to map back to ConnectorItem when toggling
  const connectorById = useMemo(
    () => new Map(allConnectors.map((c) => [c.id, c])),
    [allConnectors]
  );

  const handleToggleItem = (item: ConnectorLibraryItem, isActive: boolean) => {
    const connector = connectorById.get(item.id);
    if (connector) {
      onToggleConnector(connector, isActive);
    }
  };

  return (
    <LibraryPanel<ConnectorLibraryItem>
      onClose={onClose}
      allItems={libraryItems}
      activeItemIdSet={activeConnectorIdSet}
      onToggleItem={handleToggleItem}
      mutatingItemId={mutatingConnectorId}
      flyoutTitleId="connectorLibraryFlyoutTitle"
      libraryLabels={libraryLabels}
      manageLibraryPath={appPaths.manage.connectors}
      getItemName={getItemName}
      getSearchableText={getSearchableText}
    />
  );
};
