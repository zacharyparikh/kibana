/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { skillCreateRequestSchema } from '@kbn/agent-builder-common';

/**
 * Attachment type id for skills authored via chat.
 *
 * A `skill` attachment is a versioned, by-value snapshot of a candidate
 * skill payload. It is created by the skill-authoring inline tools and
 * rendered as an inline card. The `mode` discriminator determines whether the
 * card shows a "Create" action (POST) or a "Save changes" action (PUT).
 * Once committed, the attachment's `origin` is set to the persisted skill id
 * via `updateOrigin` so the card can show the committed state.
 */
export const SKILL_ATTACHMENT_TYPE = 'skill' as const;

export const skillAttachmentDataSchema = z.object({
  mode: z.enum(['create', 'edit']),
  skill: skillCreateRequestSchema,
});

/**
 * Data shape stored on a `skill` attachment version.
 *
 * - `mode: 'create'` — new skill draft; `skill` matches the POST request body.
 * - `mode: 'edit'`   — edit draft for an existing skill; `skill.id` is the
 *   persisted skill's id used as the PUT path parameter.
 */
export type SkillAttachmentData = z.infer<typeof skillAttachmentDataSchema>;

export type SkillAttachment = Attachment<typeof SKILL_ATTACHMENT_TYPE, SkillAttachmentData>;
