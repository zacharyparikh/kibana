/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDefinition, ToolSelection } from '@kbn/agent-builder-common';
import { CONNECTOR_TAG_PREFIX } from '@kbn/agent-builder-common/attachments';
import { filterToolsBySelection } from '@kbn/agent-builder-common';
import { isMcpTool } from '@kbn/agent-builder-common/tools';

/**
 * Extracts the connector ID associated with a tool, if any.
 * Checks MCP tool config first (`configuration.connector_id`),
 * then falls back to `connector:` tag prefix.
 */
export const getConnectorIdFromTool = (tool: ToolDefinition): string | undefined => {
  if (isMcpTool(tool)) {
    return tool.configuration.connector_id;
  }
  const connectorTag = tool.tags?.find((tag) => tag.startsWith(CONNECTOR_TAG_PREFIX));
  if (connectorTag) {
    return connectorTag.slice(CONNECTOR_TAG_PREFIX.length);
  }
  return undefined;
};

/**
 * Derives the set of connector IDs used by an agent's selected tools.
 */
export const getAgentConnectorIds = (
  allTools: ToolDefinition[],
  agentToolSelections: ToolSelection[]
): Set<string> => {
  const selectedTools = filterToolsBySelection(allTools, agentToolSelections);
  const connectorIds = new Set<string>();
  for (const tool of selectedTools) {
    const connectorId = getConnectorIdFromTool(tool);
    if (connectorId) {
      connectorIds.add(connectorId);
    }
  }
  return connectorIds;
};

/**
 * Returns all tools associated with a given connector.
 */
export const getToolsForConnector = (
  allTools: ToolDefinition[],
  connectorId: string
): ToolDefinition[] => {
  return allTools.filter((tool) => getConnectorIdFromTool(tool) === connectorId);
};

/**
 * Adds all tools for a connector to the agent's tool selections.
 */
export const addConnectorTools = (
  connectorId: string,
  allTools: ToolDefinition[],
  currentToolSelections: ToolSelection[]
): ToolSelection[] => {
  const connectorTools = getToolsForConnector(allTools, connectorId);
  const connectorToolIds = connectorTools.map((t) => t.id);
  if (connectorToolIds.length === 0) return currentToolSelections;

  // Collect all currently selected tool IDs (excluding wildcards)
  const existingIds = new Set(currentToolSelections.flatMap((s) => s.tool_ids));
  const newIds = connectorToolIds.filter((id) => !existingIds.has(id));

  if (newIds.length === 0) return currentToolSelections;

  // Add new IDs to the first non-wildcard selection, or create a new one
  const nonWildcardIdx = currentToolSelections.findIndex((s) => !s.tool_ids.includes('*'));

  if (nonWildcardIdx >= 0) {
    return currentToolSelections.map((selection, idx) =>
      idx === nonWildcardIdx
        ? { ...selection, tool_ids: [...selection.tool_ids, ...newIds] }
        : selection
    );
  }

  return [...currentToolSelections, { tool_ids: newIds }];
};

/**
 * Removes all tools for a connector from the agent's tool selections.
 */
export const removeConnectorTools = (
  connectorId: string,
  allTools: ToolDefinition[],
  currentToolSelections: ToolSelection[]
): ToolSelection[] => {
  const connectorToolIds = new Set(getToolsForConnector(allTools, connectorId).map((t) => t.id));
  if (connectorToolIds.size === 0) return currentToolSelections;

  return currentToolSelections
    .map((selection) => ({
      ...selection,
      tool_ids: selection.tool_ids.filter((id) => !connectorToolIds.has(id)),
    }))
    .filter((selection) => selection.tool_ids.length > 0);
};
