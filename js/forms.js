/* ============================================================================
   KERICHO CHESS CLUB & ACADEMY · stepped form runtime
   ----------------------------------------------------------------------------
   Powers the two long forms on the site:
     · register.html  — membership registration (4 steps)
     · consent.html   — photo & video consent      (3 steps)

   Design notes
   ------------
   · Each <section class="wz-panel" data-step="N"> is one step; only the active
     panel is shown. The rail on the left tracks where you are.
   · Validation runs on the panel you are leaving, marks the offending field
     with .bad and scrolls to the first problem instead of failing silently.
   · Nothing is written to localStorage or cookies. Form state lives in the
     page only, which matters most on the consent form (a child's details are
     never left behind on a shared device).
   · Submissions go to the same Google Apps Script endpoint as the rest of the
     site. Until that endpoint is filled in, the form still completes: it
     hands the visitor a pre-filled WhatsApp message so nothing is lost.

   Endpoint + WhatsApp number are published by js/smc.js as window.SMC.
   ============================================================================ */
(function () {
  'use strict';

  var CFG = window.SMC || {
    WHATSAPP: '254729037585',
    SHEETS_ENDPOINT: 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE'
  };
  var ENDPOINT_LIVE = CFG.SHEETS_ENDPOINT.indexOf('PASTE_YOUR') !== 0;
  var waLink = function (text) {
    return 'https://wa.me/' + CFG.WHATSAPP + '?text=' + encodeURIComponent(text);
  };
  var byId = function (id) { return document.getElementById(id); };
  var val = function (id) { var el = byId(id); return el ? el.value.trim() : ''; };
  var radio = function (name) {
    var el = document.querySelector('[name="' + name + '"]:checked');
    return el ? el.value : '';
  };
  var isOn = function (id) { var el = byId(id); return !!(el && el.checked); };
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ------------------------------------------------------------------------ *
   * Wizard
   * ------------------------------------------------------------------------ */
  function Wizard(opts) {
    this.o = opts;
    this.form = byId(opts.formId);
    if (!this.form) return;
    this.rail = byId(opts.stepsId);
    this.done = byId(opts.doneId);
    this.panels = Array.prototype.slice.call(this.form.querySelectorAll('.wz-panel'));
    this.step = 1;
    this.total = this.panels.length;
    this.bind();
    this.show(1, true);
  }

  Wizard.prototype.bind = function () {
    var self = this;

    /* next / back / jump-to-step buttons */
    this.form.addEventListener('click', function (e) {
      var next = e.target.closest('[data-next]');
      var back = e.target.closest('[data-back]');
      var jump = e.target.closest('[data-jump]');
      if (next) {
        var target = parseInt(next.getAttribute('data-next'), 10);
        if (self.validate(self.step)) self.show(target);
      } else if (back) {
        self.show(parseInt(back.getAttribute('data-back'), 10));
      } else if (jump) {
        self.show(parseInt(jump.getAttribute('data-jump'), 10));
      }
    });

    /* clear a field's error as soon as the visitor fixes it */
    this.form.addEventListener('input', function (e) {
      var el = e.target;
      if (el.type === 'radio' || el.type === 'checkbox') {
        var groupErr = self.o.radioGroups &&
          self.o.radioGroups.filter(function (g) { return g.name === el.name; })[0];
        if (groupErr && byId(groupErr.err)) byId(groupErr.err).style.display = 'none';
        if (byId(el.id + 'Err')) byId(el.id + 'Err').style.display = 'none';
        return;
      }
      var wrap = el.closest('.f');
      if (wrap) wrap.classList.remove('bad');
      self.onInput(el);
    });
    this.form.addEventListener('change', function (e) {
      self.onInput(e.target);
    });

    this.form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!self.validate(self.step)) return;
      self.submit();
    });

    if (this.o.onReady) this.o.onReady.call(self);
  };

  /* hook subclasses use to react to typing (signature preview, echoes…) */
  Wizard.prototype.onInput = function (el) {
    if (this.o.onInput) this.o.onInput.call(this, el);
  };

  Wizard.prototype.show = function (n, first) {
    if (n < 1 || n > this.total) return;
    this.step = n;
    this.panels.forEach(function (p) {
      p.classList.toggle('active', parseInt(p.getAttribute('data-step'), 10) === n);
    });

    /* rail: everything before this step is done */
    if (this.rail) {
      var items = this.rail.querySelectorAll('li');
      Array.prototype.forEach.call(items, function (li) {
        var s = parseInt(li.getAttribute('data-step'), 10);
        li.classList.toggle('active', s === n);
        li.classList.toggle('done', s < n);
      });
    }

    /* "Step X of Y" counter */
    var counter = byId(this.o.counterId);
    if (counter) {
      counter.hidden = false;
      counter.innerHTML = '<i class="fas fa-list-ol"></i> Step ' + n + ' of ' + this.total;
    }

    if (!first) {
      var shell = this.form.closest('.form-shell');
      if (shell) {
        var top = shell.getBoundingClientRect().top + window.pageYOffset - 100;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    }
    if (this.o.onShow) this.o.onShow.call(this, n);
  };

  Wizard.prototype.validate = function (n) {
    var panel = this.panels[n - 1];
    if (!panel) return true;
    var ok = true, firstBad = null;

    /* 1 · ordinary fields */
    var fields = panel.querySelectorAll('input[required], select[required], textarea[required]');
    Array.prototype.forEach.call(fields, function (el) {
      if (el.type === 'radio' || el.type === 'checkbox') return;
      var wrap = el.closest('.f');
      var v = el.value.trim();
      var good = v !== '' && (el.type !== 'email' || EMAIL_RE.test(v));
      if (el.tagName === 'SELECT') good = v !== '';
      if (!good) {
        ok = false;
        if (wrap) wrap.classList.add('bad');
        if (!firstBad) firstBad = el;
      } else if (wrap) {
        wrap.classList.remove('bad');
      }
    });

    /* 2 · named radio groups (category, payment, naming…) */
    var groups = this.o.radioGroups || [];
    groups.forEach(function (g) {
      if (!panel.querySelector('[name="' + g.name + '"]')) return;
      var chosen = panel.querySelector('[name="' + g.name + '"]:checked');
      var err = byId(g.err);
      if (!chosen) {
        ok = false;
        if (err) err.style.display = 'flex';
        if (!firstBad) firstBad = panel.querySelector('[name="' + g.name + '"]');
      } else if (err) {
        err.style.display = 'none';
      }
    });

    /* 3 · standalone "I agree" checkboxes */
    var boxes = this.o.checkIds || [];
    boxes.forEach(function (id) {
      var el = byId(id);
      if (!el || !panel.contains(el)) return;
      var err = byId(id + 'Err');
      if (!el.checked) {
        ok = false;
        if (err) err.style.display = 'flex';
        if (!firstBad) firstBad = el;
      } else if (err) {
        err.style.display = 'none';
      }
    });

    if (!ok && firstBad) {
      var wrap2 = firstBad.closest('.f') || firstBad.closest('.choice');
      var target = wrap2 || firstBad;
      try { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { /* older browsers */ }
      if (firstBad.focus) firstBad.focus({ preventScroll: true });
    }
    return ok;
  };

  Wizard.prototype.submit = function () {
    var self = this;
    var btn = byId(this.o.submitId);
    var msg = byId(this.o.msgId);
    var data = this.o.collect();

    if (!ENDPOINT_LIVE) {
      /* No backend yet — finish the journey and hand over to WhatsApp. */
      if (msg) {
        msg.textContent = 'Online submission is not connected yet. Send the details on WhatsApp and we will pick it up from there.';
        msg.className = 'form-msg show';
      }
      this.finish(data, true);
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }
    if (msg) { msg.className = 'form-msg show'; msg.textContent = ''; }
    fetch(CFG.SHEETS_ENDPOINT, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ formType: this.o.formType, timestamp: new Date().toISOString(), data: data })
    }).then(function () {
      self.finish(data, false);
    }).catch(function () {
      if (msg) {
        msg.textContent = 'Something went wrong sending that. Please try again, or use the WhatsApp button below.';
        msg.className = 'form-msg show error';
      }
      if (btn) { btn.disabled = false; btn.textContent = 'Submit'; }
      var fallback = byId(self.o.waId);
      if (fallback) { fallback.href = waLink(self.o.waSummary(data)); fallback.classList.add('show'); }
    });
  };

  Wizard.prototype.finish = function (data, viaWhatsApp) {
    var doneMsg = byId(this.o.doneMsgId);
    var refEl = byId(this.o.refId);
    var waBtn = byId(this.o.waId);
    var ref = this.o.ref();

    if (refEl) refEl.textContent = ref;
    if (doneMsg && this.o.doneText) doneMsg.textContent = this.o.doneText(viaWhatsApp);
    if (waBtn) {
      waBtn.href = waLink(this.o.waSummary(data));
      if (viaWhatsApp) waBtn.classList.add('show');
    }

    this.form.style.display = 'none';
    if (this.done) this.done.classList.add('active');
    if (this.rail) {
      Array.prototype.forEach.call(this.rail.querySelectorAll('li'), function (li) {
        li.classList.remove('active'); li.classList.add('done');
      });
    }
    var shell = this.form.closest('.form-shell');
    if (shell) {
      var top = shell.getBoundingClientRect().top + window.pageYOffset - 100;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
    if (this.o.onFinish) this.o.onFinish.call(this, data, ref);
  };

  /* ------------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------------ */
  function fillReview(form, data, labels) {
    Object.keys(data).forEach(function (key) {
      var cell = form.querySelector('[data-rv="' + key + '"]');
      if (!cell) return;
      var v = data[key];
      if (v === '' || v == null) { cell.textContent = '—'; cell.classList.add('blank'); }
      else { cell.textContent = (labels && labels[key]) ? labels[key](v) : v; cell.classList.remove('blank'); }
    });
  }

  function prettyDate(iso) {
    if (!iso) return '—';
    var parts = iso.split('-');
    if (parts.length !== 3) return iso;
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var m = months[parseInt(parts[1], 10) - 1];
    return m ? (parseInt(parts[2], 10) + ' ' + m + ' ' + parts[0]) : iso;
  }

  function makeRef(prefix) {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var out = '';
    for (var i = 0; i < 4; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
    return prefix + '-' + new Date().getFullYear() + '-' + out;
  }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  /* ======================================================================== *
   * 1 · MEMBERSHIP REGISTRATION  (register.html)
   * ======================================================================== */
  var regForm = byId('regForm');
  if (regForm) {
    var emailVerified = false;

    var reg = new Wizard({
      formId: 'regForm', stepsId: 'regSteps', doneId: 'regDone',
      counterId: 'regSaved',
      submitId: 'reg_submit', msgId: 'reg_msg', waId: 'reg_wa',
      refId: 'regRef', doneMsgId: 'regDoneMsg',
      formType: 'Membership',
      radioGroups: [
        { name: 'r_category', err: 'r_categoryErr' },
        { name: 'r_pay', err: 'r_payErr' }
      ],
      checkIds: ['r_agree'],

      onReady: function () {
        /* The "not connected" notice only makes sense while it is true */
        var offline = byId('v_offlineNotice');
        if (offline && ENDPOINT_LIVE) offline.style.display = 'none';

        /* "Send code" is only meaningful once the Apps Script endpoint is live */
        var send = byId('v_send');
        if (send) {
          send.addEventListener('click', function () {
            var email = val('r_email');
            var status = byId('v_status');
            var verify = byId('v_verify');
            if (!EMAIL_RE.test(email)) {
              if (status) status.textContent = 'Add a valid email address in step 1 first.';
              return;
            }
            if (!ENDPOINT_LIVE) {
              if (status) status.textContent = 'Not connected yet — the office will confirm ' + email + ' by hand. You can skip this step.';
              return;
            }
            send.disabled = true; send.textContent = 'Sending…';
            fetch(CFG.SHEETS_ENDPOINT, {
              method: 'POST', mode: 'no-cors',
              headers: { 'Content-Type': 'text/plain' },
              body: JSON.stringify({ formType: 'VerifyEmail', timestamp: new Date().toISOString(), data: { email: email } })
            }).then(function () {
              send.disabled = false; send.textContent = 'Resend code';
              if (status) status.textContent = 'Code sent to ' + email + '.';
              if (verify) verify.disabled = false;
            }).catch(function () {
              send.disabled = false; send.textContent = 'Send code';
              if (status) status.textContent = 'Could not send the code. Try again, or skip this step.';
            });
          });
        }
        var verifyBtn = byId('v_verify');
        if (verifyBtn) {
          verifyBtn.addEventListener('click', function () {
            var code = val('v_code').replace(/\D/g, '');
            var wrap = byId('v_code').closest('.f');
            if (code.length !== 6) {
              if (wrap) wrap.classList.add('bad');
              return;
            }
            if (wrap) wrap.classList.remove('bad');
            emailVerified = true;
            this.show(3);
          }.bind(this));
        }
      },

      onShow: function (n) {
        var echo = byId('v_emailEcho');
        if (n === 2 && echo) {
          var e = val('r_email');
          echo.textContent = e || '—';
          echo.classList.toggle('blank', !e);
        }
        if (n === 4) fillReview(this.form, this.o.collect(), {
          dob: prettyDate,
          verified: function (v) { return v; }
        });
      },

      collect: function () {
        return {
          name: val('r_name'), dob: val('r_dob'), gender: val('r_gender'),
          phone: val('r_phone'), email: val('r_email'), county: val('r_county'),
          school: val('r_school'), idno: val('r_idno'), fide: val('r_fide'),
          verified: emailVerified ? 'Verified' : 'Not verified — the office will confirm',
          category: radio('r_category'), pay: radio('r_pay'), notes: val('r_notes')
        };
      },
      ref: function () { return makeRef('KCA'); },
      doneText: function (viaWA) {
        return viaWA
          ? 'Your details are ready to send. Tap the WhatsApp button and the academy office will pick them up and issue your membership ID.'
          : 'Thank you. Your registration is on its way to the academy office. Once payment is confirmed you will receive your membership ID by email or WhatsApp.';
      },
      waSummary: function (d) {
        return 'Hi Shem, academy membership registration:\n' +
          'Name: ' + d.name + '\n' +
          'Date of birth: ' + prettyDate(d.dob) + '\n' +
          'Gender: ' + d.gender + '\n' +
          'Phone: ' + d.phone + '\n' +
          'Email: ' + d.email + '\n' +
          'County: ' + d.county + '\n' +
          (d.school ? 'School/Club: ' + d.school + '\n' : '') +
          (d.fide ? 'FIDE ID: ' + d.fide + '\n' : '') +
          (d.idno ? 'ID/Passport: ' + d.idno + '\n' : '') +
          'Category: ' + d.category + '\n' +
          'Payment: ' + d.pay + '\n' +
          (d.notes ? 'Notes: ' + d.notes : '');
      }
    });

  }

  /* ======================================================================== *
   * 2 · PHOTO & VIDEO CONSENT  (consent.html)
   * ======================================================================== */
  if (byId('conForm')) {
    var con = new Wizard({
      formId: 'conForm', stepsId: 'conSteps', doneId: 'conDone',
      counterId: 'conSaved',
      submitId: 'con_submit', msgId: 'con_msg', waId: 'con_wa',
      refId: 'conRef', doneMsgId: 'conDoneMsg',
      formType: 'PhotoVideoConsent',
      radioGroups: [{ name: 'p_naming', err: 'p_namingErr' }],
      checkIds: ['c_agree'],

      onReady: function () {
        var dateEl = byId('c_date');
        if (dateEl && !dateEl.value) dateEl.value = todayISO();
      },

      onInput: function (el) {
        var preview = byId('sigPreview');
        if (preview && el.id === 'c_signature') {
          preview.textContent = el.value.trim() || '—';
        }
      },

      onShow: function (n) {
        if (n === 3) {
          fillReview(this.form, this.o.collect(), { childDob: prettyDate, date: prettyDate });
          var preview = byId('sigPreview');
          if (preview) preview.textContent = val('c_signature') || '—';
        }
      },

      collect: function () {
        return {
          child: val('c_child'), childDob: val('c_dob'), section: val('c_section'),
          childSchool: val('c_school'),
          guardian: val('c_guardian'), relation: val('c_relation'),
          phone: val('c_phone'), email: val('c_email'),
          internal: isOn('p_internal') ? 'Yes' : 'No',
          public: isOn('p_public') ? 'Yes' : 'No',
          naming: radio('p_naming'), notes: val('c_notes'),
          signature: val('c_signature'), date: val('c_date')
        };
      },
      ref: function () { return makeRef('CON'); },
      doneText: function (viaWA) {
        return viaWA
          ? 'Your choices are ready to send. Tap WhatsApp and the academy will file the consent against the player\'s record.'
          : 'Thank you. Your consent has been recorded. You can change or withdraw it at any time by writing to the academy.';
      },
      waSummary: function (d) {
        return 'Hi Shem, photo & video consent:\n' +
          'Player: ' + d.child + '\n' +
          'Date of birth: ' + prettyDate(d.childDob) + '\n' +
          (d.section ? 'Section: ' + d.section + '\n' : '') +
          (d.childSchool ? 'School/Club: ' + d.childSchool + '\n' : '') +
          'Parent/Guardian: ' + d.guardian + ' (' + d.relation + ')\n' +
          'Phone: ' + d.phone + '\n' +
          'Email: ' + d.email + '\n' +
          'Internal use: ' + d.internal + '\n' +
          'Publicity: ' + d.public + '\n' +
          'Naming: ' + d.naming + '\n' +
          (d.notes ? 'Notes: ' + d.notes + '\n' : '') +
          'Signed: ' + d.signature + ' on ' + prettyDate(d.date);
      }
    });

  }
})();
