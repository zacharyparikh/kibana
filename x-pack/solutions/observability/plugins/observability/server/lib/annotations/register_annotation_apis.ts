/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { schema } from '@kbn/config-schema';
import { CoreSetup, RequestHandler, Logger } from '@kbn/core/server';
import { isLeft } from 'fp-ts/Either';
import { formatErrors } from '@kbn/securitysolution-io-ts-utils';
import {
  getAnnotationByIdRt,
  createAnnotationRt,
  deleteAnnotationRt,
  findAnnotationRt,
  updateAnnotationRt,
} from '../../../common/annotations';
import { ScopedAnnotationsClient } from './bootstrap_annotations';
import { createAnnotationsClient } from './create_annotations_client';
import type { ObservabilityRequestHandlerContext } from '../../types';

const unknowns = schema.object({}, { unknowns: 'allow' });

export function registerAnnotationAPIs({
  core,
  index,
  logger,
}: {
  core: CoreSetup;
  index: string;
  logger: Logger;
}) {
  function wrapRouteHandler<TType extends t.Type<any>>(
    types: TType,
    handler: (params: { data: t.TypeOf<TType>; client: ScopedAnnotationsClient }) => Promise<any>
  ): RequestHandler<unknown, unknown, unknown, ObservabilityRequestHandlerContext> {
    return async (
      ...args: Parameters<
        RequestHandler<unknown, unknown, unknown, ObservabilityRequestHandlerContext>
      >
    ) => {
      const [context, request, response] = args;

      const rt = types;

      const data = {
        body: request.body,
        query: request.query,
        params: request.params,
      };

      const validation = rt.decode(data);

      if (isLeft(validation)) {
        return response.badRequest({
          body: formatErrors(validation.left).join('|'),
        });
      }

      const esClient = (await context.core).elasticsearch.client.asCurrentUser;
      const license = (await context.licensing)?.license;

      const client = createAnnotationsClient({
        index,
        esClient,
        logger,
        license,
      });

      try {
        const res = await handler({
          data: validation.right,
          client,
        });

        return response.ok({
          body: res,
        });
      } catch (error) {
        const statusCode = error.output?.statusCode ?? 500;
        const errorMessage = error.output?.payload?.message ?? 'An internal server error occurred';
        if (statusCode >= 500) {
          logger.error(errorMessage, { error });
        } else {
          logger.debug(errorMessage, { error });
        }

        return response.custom({
          statusCode,
          body: {
            message: errorMessage,
          },
        });
      }
    };
  }

  const router = core.http.createRouter<ObservabilityRequestHandlerContext>();

  router.post(
    {
      path: '/api/observability/annotation',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to Elasticsearch',
        },
      },
      validate: {
        body: unknowns,
      },
      options: {
        access: 'public',
      },
    },
    wrapRouteHandler(t.type({ body: createAnnotationRt }), ({ data, client }) => {
      return client.create(data.body);
    })
  );

  router.put(
    {
      path: '/api/observability/annotation/{id}',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to Elasticsearch',
        },
      },
      validate: {
        body: unknowns,
      },
      options: {
        access: 'public',
      },
    },
    wrapRouteHandler(t.type({ body: updateAnnotationRt }), ({ data, client }) => {
      return client.update(data.body);
    })
  );

  router.delete(
    {
      path: '/api/observability/annotation/{id}',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to Elasticsearch',
        },
      },
      validate: {
        params: unknowns,
      },
      options: {
        access: 'public',
      },
    },
    wrapRouteHandler(t.type({ params: deleteAnnotationRt }), ({ data, client }) => {
      return client.delete(data.params);
    })
  );

  router.get(
    {
      path: '/api/observability/annotation/{id}',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to Elasticsearch',
        },
      },
      validate: {
        params: unknowns,
      },
      options: {
        access: 'public',
      },
    },
    wrapRouteHandler(t.type({ params: getAnnotationByIdRt }), ({ data, client }) => {
      return client.getById(data.params);
    })
  );

  router.get(
    {
      path: '/api/observability/annotation/find',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to Elasticsearch',
        },
      },
      validate: {
        query: unknowns,
      },
      options: {
        access: 'public',
      },
    },
    wrapRouteHandler(t.type({ query: findAnnotationRt }), ({ data, client }) => {
      return client.find(data.query);
    })
  );

  router.get(
    {
      path: '/api/observability/annotation/permissions',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to Elasticsearch',
        },
      },
      validate: {
        query: unknowns,
      },
      options: {
        access: 'public',
      },
    },
    wrapRouteHandler(t.type({}), ({ client }) => {
      return client.permissions();
    })
  );
}
