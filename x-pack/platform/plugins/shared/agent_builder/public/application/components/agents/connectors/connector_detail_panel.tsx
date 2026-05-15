/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSkeletonCircle,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { labels } from '../../../utils/i18n';
import { useGetConnector } from '../../../hooks/tools/use_mcp_connectors';
import { useKibana } from '../../../hooks/use_kibana';
import { DetailPanelLayout } from '../common/detail_panel_layout';

interface ConnectorDetailPanelProps {
  connectorId: string;
  onRemove: () => void;
}

export const ConnectorDetailPanel: React.FC<ConnectorDetailPanelProps> = ({
  connectorId,
  onRemove,
}) => {
  const { euiTheme } = useEuiTheme();
  const { connector, isLoading } = useGetConnector({ connectorId });
  const {
    services: {
      plugins: { triggersActionsUi },
    },
  } = useKibana();

  const actionTypeId = connector?.actionTypeId;
  const actionTypeModel = actionTypeId
    ? triggersActionsUi.actionTypeRegistry.has(actionTypeId)
      ? triggersActionsUi.actionTypeRegistry.get(actionTypeId)
      : undefined
    : undefined;

  const typeName = actionTypeModel?.actionTypeTitle ?? actionTypeId ?? '';
  const typeDescription = actionTypeModel?.selectMessage ?? '';
  const iconClass = actionTypeModel?.iconClass ?? 'plugs';

  return (
    <DetailPanelLayout
      isLoading={isLoading}
      isEmpty={!connector}
      title={connector?.name ?? connectorId}
      headerContent={
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          responsive={false}
          css={css`
            margin-top: ${euiTheme.size.xs};
          `}
        >
          <EuiFlexItem grow={false}>
            <Suspense fallback={<EuiSkeletonCircle size="s" />}>
              <EuiIcon type={iconClass} size="m" />
            </Suspense>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {typeName}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      headerActions={(openConfirmRemove) => (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" size="xs" color="danger" onClick={openConfirmRemove}>
              {labels.agentConnectors.removeConnectorButtonLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      confirmRemove={{
        title: labels.agentConnectors.removeConnectorConfirmTitle(connector?.name ?? connectorId),
        body: labels.agentConnectors.removeConnectorConfirmBody,
        confirmButtonText: labels.agentConnectors.removeConnectorConfirmButton,
        cancelButtonText: labels.agentConnectors.removeConnectorCancelButton,
        onConfirm: onRemove,
      }}
    >
      <div
        css={css`
          padding: ${euiTheme.size.l};
        `}
      >
        <EuiTitle size="xxxs">
          <h4>{labels.agentConnectors.connectorDetailDescriptionLabel}</h4>
        </EuiTitle>
        <EuiText
          size="s"
          css={css`
            margin-top: ${euiTheme.size.s};
          `}
        >
          {typeDescription || '\u2014'}
        </EuiText>
      </div>
    </DetailPanelLayout>
  );
};
