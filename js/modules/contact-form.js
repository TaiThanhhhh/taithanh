/**
 * @file Contact form: client-side validation + delivery through EmailJS.
 */
(function (Portfolio) {
  'use strict';

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const MESSAGES = {
    missingFields: '⚠️ Please fill in all fields!',
    invalidEmail: '⚠️ Please enter a valid email address!',
    success: '✅ Email sent successfully!',
    failure: '❌ An error occurred while sending the email. Please try again later!',
  };

  const BUTTON_LABEL = {
    idle: 'Submit',
    sending: '📨 Sending...',
  };

  /**
   * @param {HTMLFormElement} form
   * @returns {{from_name: string, from_email: string, subject: string, message: string}}
   */
  function readForm(form) {
    const value = (id) => form.querySelector(`#${id}`).value.trim();
    return {
      from_name: value('name'),
      from_email: value('email'),
      subject: value('subject'),
      message: value('body'),
    };
  }

  /**
   * @param {ReturnType<typeof readForm>} params
   * @returns {string|null} Error message, or null when valid.
   */
  function validate(params) {
    if (Object.values(params).some((v) => !v)) return MESSAGES.missingFields;
    if (!EMAIL_PATTERN.test(params.from_email)) return MESSAGES.invalidEmail;
    return null;
  }

  function setSending(button, isSending) {
    button.disabled = isSending;
    button.textContent = isSending ? BUTTON_LABEL.sending : BUTTON_LABEL.idle;
  }

  async function handleSubmit(form, button) {
    const params = readForm(form);
    const error = validate(params);
    if (error) {
      alert(error);
      return;
    }

    const { serviceId, templateId } = Portfolio.config.emailjs;
    setSending(button, true);
    try {
      await emailjs.send(serviceId, templateId, params);
      alert(MESSAGES.success);
      form.reset();
    } catch (err) {
      console.error('[contact-form] EmailJS send failed', err);
      alert(MESSAGES.failure);
    } finally {
      setSending(button, false);
    }
  }

  Portfolio.contactForm = {
    init() {
      const form = document.getElementById('myForm');
      const button = document.getElementById('submit');
      if (!form || !button) return;

      if (typeof emailjs === 'undefined') {
        console.warn('[contact-form] EmailJS SDK not loaded; form disabled.');
        return;
      }
      emailjs.init(Portfolio.config.emailjs.publicKey);

      button.addEventListener('click', (event) => {
        event.preventDefault();
        handleSubmit(form, button);
      });
    },
  };
})((window.Portfolio = window.Portfolio || {}));
