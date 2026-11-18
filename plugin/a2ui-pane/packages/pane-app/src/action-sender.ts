/*
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {formatActionText, A2uiActionDetails} from '@a2ui-pane/protocol';
import {showToast} from './toast.js';

/** Configuration and dependency injection hooks for `ActionSender`. */
export interface ActionSenderOptions {
  conversationId?: string | null;
  onPendingChange?: (pendingComponents: ReadonlySet<string>) => void;
  showToastFn?: (message: string, isError?: boolean) => void;
  sendMessageFn?: (text: string, conversationId?: string) => Promise<any>;
}

/**
 * Handles outgoing A2UI user actions from the pane.
 * Formats actions into human-readable + <a2ui-action> text, manages pending state
 * to prevent duplicate clicks, and surfaces error toasts on delivery failures.
 */
export class ActionSender {
  private readonly pendingComponents = new Set<string>();

  constructor(private readonly options: ActionSenderOptions = {}) {}

  getPendingComponents(): ReadonlySet<string> {
    return new Set(this.pendingComponents);
  }

  isPending(componentId: string): boolean {
    return this.pendingComponents.has(componentId);
  }

  /**
   * Sends one action to the agent as a chat message.
   *
   * @returns `true` only when the message was handed to the host (or simulated in
   *     standalone mode). `false` means nothing was sent: the same component already
   *     has an action in flight, or delivery failed and an error toast was shown.
   *     Callers must not retire the surface on `false`.
   */
  async sendAction(
    action: A2uiActionDetails,
    dataModel?: Record<string, unknown>,
  ): Promise<boolean> {
    const sourceId = action.sourceComponentId;

    // Prevent duplicate clicks while an action from this component is in flight
    if (sourceId && this.pendingComponents.has(sourceId)) {
      return false;
    }

    if (sourceId) {
      this.pendingComponents.add(sourceId);
      this.options.onPendingChange?.(new Set(this.pendingComponents));
    }

    const text = formatActionText(action, {
      label: typeof action.context?.label === 'string' ? action.context.label : undefined,
      dataModel,
    });

    const sendFn =
      this.options.sendMessageFn ??
      (typeof window !== 'undefined' && (window as any).sidecar?.agent?.sendMessage
        ? (window as any).sidecar.agent.sendMessage
        : undefined);

    const toastFn = this.options.showToastFn ?? showToast;

    if (!sendFn) {
      console.warn(
        '[ActionSender] window.sidecar.agent.sendMessage is not available. Simulating action dispatch in standalone mode:',
        text,
      );
      this.releaseComponent(sourceId);
      toastFn('Action dispatched (standalone mode)', false);
      return true;
    }

    try {
      if (this.options.conversationId) {
        await sendFn(text, this.options.conversationId);
      } else {
        await sendFn(text);
      }
      this.releaseComponent(sourceId);
      return true;
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to send action to agent';
      console.error('[ActionSender] Error sending action to agent:', err);
      this.releaseComponent(sourceId);
      toastFn(`Action failed: ${errMsg}`, true);
      return false;
    }
  }

  private releaseComponent(sourceId?: string): void {
    if (sourceId && this.pendingComponents.has(sourceId)) {
      this.pendingComponents.delete(sourceId);
      this.options.onPendingChange?.(new Set(this.pendingComponents));
    }
  }
}
