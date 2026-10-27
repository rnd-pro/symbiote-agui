export let FEEDBACK_SETTINGS_STATE = {
  feedbackOpen: false,
  feedbackSession: '',
  feedbackConversation: '',
  feedbackCommand: '',
  feedbackOwnerBound: false,
  feedbackDisabled: true,
  feedbackDisableDisabled: true,
  feedbackMessage: '',
  feedbackError: '',
};

export class SessionFeedbackSettings {
  sessionId = '';
  /** @type {import('../../../types/feedback.js').FeedbackSettings | undefined} */
  settings;

  /** @param {import('./index.js').SessionManager} owner */
  constructor(owner) {
    this.owner = owner;
  }

  /** @param {string} sessionId */
  open(sessionId) {
    let owner = this.owner;
    if (!owner.connection?.ready || owner.busy) { return; }
    this.sessionId = sessionId;
    this.settings = undefined;
    owner.set$({
      feedbackOpen: true,
      feedbackSession: sessionId,
      feedbackConversation: '',
      feedbackCommand: JSON.stringify({
        executable: '',
        args: [],
        input: {
          channel: 'stdin',
        },
      }, null, 2),
      feedbackMessage: '',
      feedbackError: '',
    });
    return this.run('feedback settings');
  }

  render() {
    let owner = this.owner;
    let active = owner.snapshot?.sessions.some((row) => row.sessionId === this.sessionId && row.active === true && row.ok);
    let disabled = !owner.connection?.ready || owner.busy || !active || !this.settings;
    owner.set$({
      feedbackDisabled: disabled,
      feedbackDisableDisabled: disabled || this.settings?.status.state === 'disabled',
      feedbackOwnerBound: !!this.settings?.conversationId,
    });
  }

  /**
   * @param {Event} event
   * @param {boolean} [disable]
   */
  submit(event, disable = false) {
    event.preventDefault();
    if (!event.isTrusted || Reflect.get(event, 'agentInvoked') === true
      || this.owner.$.feedbackDisabled || (disable && this.owner.$.feedbackDisableDisabled)) { return; }
    let form = document.getElementById('manager-feedback-form');
    if (!disable && form instanceof HTMLFormElement && !form.reportValidity()) { return; }
    return this.run(disable ? 'feedback disable' : 'feedback configure');
  }

  /** @param {'feedback settings' | 'feedback configure' | 'feedback disable'} operation */
  async run(operation) {
    let owner = this.owner;
    let connection = owner.connection;
    if (!connection?.ready || owner.busy || !this.sessionId) { return; }
    /** @type {Partial<import('../../../types/manager.js').ManagerRequest>} */
    let options = {
      sessionId: this.sessionId,
    };
    owner.$.feedbackError = '';
    if (operation !== 'feedback settings') {
      if (!this.settings) { return; }
      options.instanceId = this.settings.instanceId;
    }
    if (operation === 'feedback configure') {
      try { options.command = JSON.parse(String(owner.$.feedbackCommand)); }
      catch { owner.$.feedbackError = 'Command must be valid JSON.'; return; }
      options.conversationId = String(owner.$.feedbackConversation).trim();
    }
    owner.busy = true;
    let epoch = owner.viewEpoch;
    let sessionId = this.sessionId;
    owner.$.feedbackMessage = 'Loading feedback settings...';
    owner.renderRows();
    try {
      let result = await connection.request(operation, options);
      if (!owner.isCurrentView(epoch) || sessionId !== this.sessionId) { return; }
      if (!result.ok || !result.feedbackSettings) { throw new Error(result.error?.message || 'Feedback settings are unavailable.'); }
      this.settings = result.feedbackSettings;
      owner.$.feedbackConversation = this.settings.conversationId;
      if (this.settings.command) { owner.$.feedbackCommand = JSON.stringify(this.settings.command, null, 2); }
      let messages = {
        'feedback settings': `Feedback is ${this.settings.status.state}.`,
        'feedback configure': 'Feedback command configured. No delivery was attempted.',
        'feedback disable': 'Feedback disabled. Conversation ownership is retained.',
      };
      owner.$.feedbackMessage = messages[operation];
      await owner.refresh();
    } catch (error) {
      if (owner.isCurrentView(epoch) && sessionId === this.sessionId) {
        owner.$.feedbackMessage = '';
        owner.$.feedbackError = error instanceof Error ? error.message : String(error);
      }
    } finally {
      owner.busy = false;
      owner.renderRows();
    }
  }
}
