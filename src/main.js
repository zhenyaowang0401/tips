import "./style.css";
import Sortable from "sortablejs";
const KEY = "carrot-pocket-v1";
const today = () => new Date().toLocaleDateString("sv-SE");
let state = { tasks: [], days: [], sound: true };
let storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  if (saved && Array.isArray(saved.tasks) && Array.isArray(saved.days))
    state = { ...state, ...saved };
} catch {
  storageAvailable = false;
}
let tab = "open",
  filter = "all",
  modal = null,
  pending = new Set();
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const id = () => crypto.randomUUID();
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    storageAvailable = false;
    toast("Could not save. Keep this page open.");
  }
};
const carrot = `<svg viewBox="0 0 64 72" fill="none" aria-hidden="true" class="carrot"><path d="M30 25V9h7v10h7V5h8v15h-8v9H30Z" fill="#447443"/><path d="M30 25V15h-9V8h-8v14h9v10" fill="#719354"/><path d="M21 28h25v7h7v14h-7v7h-7v7h-7v7H18V56h-7V42h-7v-7h17Z" fill="#e97e3c"/><path d="M21 28h25v7H21v7h-7v14h-3V42H4v-7h17Z" fill="#f3a659"/><path d="M39 42h14v7H39zm-14 14h14v7H25Z" fill="#bc562b"/><path d="M21 42h7v7h-7Z" fill="#593a29"/><path d="M36 35h7v7h-7Z" fill="#593a29"/></svg>`;
let draft = "";
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const windowControls =
  '<span class="window-controls" aria-hidden="true"><i>_</i><i>□</i><i>×</i></span>';
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(
    () => $("#toast").classList.remove("show"),
    2800,
  );
}
function completedToday() {
  return state.tasks.filter(
    (t) => t.done && t.doneAt?.slice(0, 10) === today(),
  );
}
let sorter = null;
const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* Haptics are optional. */
  }
}
function visibleTasks() {
  return state.tasks.filter((t) => t.done === (tab === "done"));
}
function saveTaskOrder(visibleIds, doneView) {
  // Completed tasks are displayed in reverse; preserve that view on reload.
  const ids = doneView ? visibleIds.slice().reverse() : visibleIds;
  const byId = new Map(state.tasks.map((t) => [t.id, t]));
  const reordered = ids.map((id) => byId.get(id));
  const current = state.tasks.filter((t) => t.done === doneView);
  if (
    reordered.length !== current.length ||
    reordered.some((t) => !t || t.done !== doneView) ||
    new Set(ids).size !== ids.length
  )
    return;
  let index = 0;
  state.tasks = state.tasks.map((t) =>
    t.done === doneView ? reordered[index++] : t,
  );
  save();
}
function enableSorting() {
  const list = $(".task-list");
  if (!list) return;
  const doneView = tab === "done";
  sorter = new Sortable(list, {
    draggable: ".task",
    handle: ".drag-handle",
    animation: reducedMotion() ? 0 : 160,
    forceFallback: true,
    fallbackOnBody: true,
    fallbackTolerance: 4,
    ghostClass: "sort-ghost",
    chosenClass: "sort-chosen",
    dragClass: "sort-drag",
    scrollSensitivity: 65,
    scrollSpeed: 12,
    disabled: pending.size > 0,
    onStart() {
      vibrate(15);
      document.body.classList.add("is-sorting");
    },
    onEnd(event) {
      document.body.classList.remove("is-sorting");
      if (event.oldIndex === event.newIndex) return;
      saveTaskOrder(
        [...list.querySelectorAll(".task")].map((t) => t.dataset.id),
        doneView,
      );
      vibrate(12);
      toast("Order saved.");
    },
  });
}
function render() {
  sorter?.destroy();
  sorter = null;
  document.body.classList.remove("is-sorting");
  const open = state.tasks.filter((t) => !t.done),
    done = state.tasks.filter((t) => t.done),
    count = completedToday().length;
  $("#app").innerHTML =
    `<div class="desktop"><header class="desktop-header"><button class="wordmark" data-action="home" aria-label="carrot home"><span>${carrot}</span>carrot</button><span class="desktop-date">${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })}</span></header><nav class="desktop-shortcuts" aria-label="Desktop"><button class="shortcut ${filter === "all" ? "active" : ""}" data-action="home"><span class="folder-icon"><i></i></span><span>My tasks</span></button><button class="shortcut ${filter === "history" ? "active" : ""}" data-action="history"><span class="log-icon"><i></i><i></i><i></i></span><span>Daily log</span></button></nav><main class="workspace"><div class="window-shadow" aria-hidden="true"></div><section class="app-window"><div class="titlebar"><span class="window-title"><span class="title-carrot">${carrot}</span>${filter === "history" ? "daily-log.txt" : "carrot.exe"}</span>${windowControls}</div><div class="menubar"><nav aria-label="View"><button class="menu-item ${filter === "all" ? "active" : ""}" data-action="home">Tasks</button><button class="menu-item ${filter === "history" ? "active" : ""}" data-action="history">Daily log</button></nav><button class="sound-button" data-action="sound" aria-label="${state.sound ? "Mute" : "Enable"} sound" aria-pressed="${state.sound}"><span aria-hidden="true">${state.sound ? "♫" : "♪"}</span> Sound ${state.sound ? "on" : "off"}</button></div>${filter === "history" ? historyMarkup() : `<div class="window-content"><form id="quick-form" class="composer"><label for="quick-input">What's on your mind?</label><div class="input-row"><textarea id="quick-input" rows="1" maxlength="240" placeholder="Type a thought…">${esc(draft)}</textarea><button type="submit" class="retro-button add-button" aria-label="Add task">Add <span>↵</span></button></div></form><div class="list-toolbar"><div class="tabs" role="group" aria-label="Task filter"><button class="tab ${tab === "open" ? "selected" : ""}" data-tab="open">To do <span>${open.length}</span></button><button class="tab ${tab === "done" ? "selected" : ""}" data-tab="done">Done <span>${done.length}</span></button></div><button class="new-goal" data-action="goal">+ New goal</button></div><p id="drag-help" class="sr-only">Drag the dotted handle to reorder. With the handle focused, use the up and down arrow keys.</p><div class="task-list">${(tab === "open" ? open : done.slice().reverse()).map(taskMarkup).join("") || emptyMarkup()}</div><div class="window-footer"><span class="task-count"><b class="status-light"></b>${open.length} left <span class="count-separator">/</span> ${count} done today</span><button class="retro-button end-day" data-action="end">End day</button></div></div>`}<div class="statusbar"><span><span class="disk-icon" aria-hidden="true">▣</span> ${storageAvailable ? "Saved on this device" : "Storage unavailable"}</span><span class="resize-grip" aria-hidden="true">◢</span></div></section><div class="under-window"><span>one thing at a time.</span><span>✳</span></div></main><div class="desktop-decoration" aria-hidden="true"><span class="deco-spark">✳</span>${carrot}</div><footer class="taskbar"><button class="start-button retro-button" data-action="home"><span>${carrot}</span><strong>carrot</strong></button><span class="taskbar-divider"></span><button class="taskbar-app retro-inset" data-action="${filter === "history" ? "history" : "home"}"><span aria-hidden="true">${filter === "history" ? "▤" : "▣"}</span> ${filter === "history" ? "Daily log" : "My tasks"}</button><div class="taskbar-tray"><span class="tray-dot"></span><time>${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</time></div></footer></div><div id="toast" role="status"></div><div id="particles" aria-hidden="true"></div><div id="modal-root"></div>`;
  enableSorting();
  if (modal) renderModal();
}
function emptyMarkup() {
  return `<div class="empty"><div class="empty-art" aria-hidden="true"><span class="empty-spark">+</span>${tab === "open" ? carrot : '<span class="big-check">✓</span>'}<span class="empty-spark second">+</span></div><h1>${tab === "open" ? "A little room for your thoughts." : "Your wins go here."}</h1><p>${tab === "open" ? "Type it. Do it. Crush it." : "Finish a task to get started."}</p></div>`;
}
function taskMarkup(t) {
  const n = t.conditions.filter((c) => c.done).length;
  return `<article class="task ${t.done ? "done" : ""} ${t.important ? "important" : ""}" data-id="${t.id}">
    <button class="drag-handle" data-drag="${t.id}" aria-label="Move: ${esc(t.title)}" aria-describedby="drag-help" title="Drag to reorder · Arrow keys to move"><svg viewBox="0 0 12 18" width="10" height="16" fill="currentColor" aria-hidden="true"><path d="M1 1h3v3H1zm6 0h3v3H7zM1 7h3v3H1zm6 0h3v3H7zM1 13h3v3H1zm6 0h3v3H7z"/></svg></button>
    <button class="task-check" data-complete="${t.id}" aria-label="${t.done ? "Reopen" : "Complete"}: ${esc(t.title)}">${t.done ? "✓" : "<span>✦</span>"}</button>
    <div class="task-body"><div class="task-title">${esc(t.title)}</div>${t.important ? '<span class="important-badge">! IMPORTANT</span>' : ""}
    ${t.conditions.length ? `<button class="condition-progress" data-detail="${t.id}" aria-label="Edit conditions for ${esc(t.title)}"><span class="progress-track"><span style="width:${(n / t.conditions.length) * 100}%"></span></span><span>${n}/${t.conditions.length}</span><span class="goal-badge">GOAL</span></button>` : ""}</div>
    <button class="task-priority" data-priority="${t.id}" aria-label="${t.important ? "Remove importance" : "Mark important"}: ${esc(t.title)}" aria-pressed="${!!t.important}" title="${t.important ? "Remove importance" : "Mark important"}"><svg viewBox="0 0 18 20" width="15" height="17" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 18V2m0 0h12l-3 4 3 4H3Z"/></svg></button>
    <button class="task-more" data-detail="${t.id}" aria-label="Edit: ${esc(t.title)}">···</button>
  </article>`;
}
function historyMarkup() {
  return `<div class="window-content history"><div class="history-heading"><h1>Daily log</h1><span>${plural(state.days.length, "day")}</span></div><div class="history-list">${
    state.days.length
      ? state.days
          .slice()
          .reverse()
          .map(
            (d) =>
              `<article class="history-card"><header><time>${esc(d.date)}</time><span>${d.titles.length} done <span class="orange">✦</span></span></header>${d.titles.length ? "<ul>" + d.titles.map((t) => `<li><span>✓</span>${esc(t)}</li>`).join("") + "</ul>" : "<p>A quiet day. That counts, too.</p>"}</article>`,
          )
          .join("")
      : '<div class="empty"><span class="log-icon large-log" aria-hidden="true"><i></i><i></i><i></i></span><h2>No days saved. Yet.</h2><p>Use “End day” to keep your wins.</p></div>'
  }</div><button class="retro-button back-button" data-action="home">← Back to tasks</button></div>`;
}
let returnFocus = null;
function openModal(type, taskId) {
  returnFocus = document.activeElement;
  modal = { type, taskId };
  renderModal();
  setTimeout(() => ($("#goal-title") || $(".modal-close"))?.focus(), 30);
}
function closeModal() {
  modal = null;
  $("#modal-root").innerHTML = "";
  if (returnFocus?.isConnected) returnFocus.focus();
  else $("#quick-input")?.focus();
}
function renderModal() {
  const t = state.tasks.find((t) => t.id === modal.taskId);
  const end = modal.type === "end";
  const tasks = completedToday();
  $("#modal-root").innerHTML =
    `<div class="modal-backdrop"><section class="modal app-window" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="titlebar"><span class="window-title">${end ? "today.txt" : t ? "edit-task.exe" : "new-goal.exe"}</span><button class="modal-close" data-action="close" aria-label="Close dialog">×</button></div><div class="modal-content">${end ? `<div class="summary-heading"><span class="summary-icon" aria-hidden="true">✦</span><div><h2 id="modal-title">${tasks.length ? "Nice work today." : "Calling it a day?"}</h2><p>${plural(tasks.length, "little win")}.</p></div></div><div class="summary-list">${tasks.length ? "<ul>" + tasks.map((t) => `<li><span>✓</span>${esc(t.title)}</li>`).join("") + "</ul>" : "<p>Rest is part of the process.</p>"}</div><p class="carry-note">${state.tasks.filter((t) => !t.done).length} unfinished. Ready when you are.</p><button class="retro-button primary full" data-action="save-day">Save & close day <span>↵</span></button>` : `<h2 id="modal-title">${t ? "Edit task" : "Plant a goal."}</h2><form id="goal-form"><label for="goal-title">${t ? "Task" : "Goal"}</label><input id="goal-title" maxlength="240" placeholder="Finish my research" value="${esc(t?.title || "")}" required><label class="importance-option"><input id="goal-important" type="checkbox" ${t?.important ? "checked" : ""}> <span>! Important</span></label><label class="conditions-label">Done when… <span>optional</span></label><div id="condition-fields">${(t?.conditions || []).map((c) => conditionField(c)).join("")}</div><button type="button" class="add-condition" data-action="add-condition">+ Add a step</button><div class="modal-actions">${t ? '<button type="button" class="delete-button" data-action="delete">Delete task</button>' : '<button type="button" class="retro-button" data-action="close">Cancel</button>'}<button class="retro-button primary" type="submit">${t ? "Save changes" : "Add goal"} <span>↵</span></button></div></form>`}</div></section></div>`;
}
function conditionField(c = { text: "", done: false }) {
  return `<div class="condition-field"><input type="checkbox" aria-label="Complete step" ${c.done ? "checked" : ""}><input type="text" maxlength="240" placeholder="One small step" value="${esc(c.text)}" aria-label="Completion step"><button type="button" class="remove-condition" aria-label="Remove step">×</button></div>`;
}
function addTask(title, conditions = [], important = false) {
  state.tasks.push({
    id: id(),
    title,
    conditions,
    important,
    created: new Date().toISOString(),
    done: false,
  });
  save();
  tab = "open";
  draft = "";
  render();
  toast("Thought saved.");
  $("#quick-input")?.focus();
}
let audio;
function chime() {
  if (!state.sound) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    [659.25, 987.77, 1318.5].forEach((f, i) => {
      const osc = audio.createOscillator(),
        gain = audio.createGain(),
        at = audio.currentTime + i * 0.075;
      osc.type = "square";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.035, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.14);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(at);
      osc.stop(at + 0.15);
    });
  } catch {}
}
function burst(x, y) {
  for (let i = 0; i < 22; i++) {
    const p = document.createElement("i");
    p.className = "particle";
    p.style.cssText = `left:${x}px;top:${y}px;--x:${(Math.random() - 0.5) * 230}px;--y:${-Math.random() * 180 + 35}px;--r:${Math.random() * 360}deg;background:${["#df7442", "#efbb52", "#69824d", "#533f30"][i % 4]}`;
    $("#particles").append(p);
    setTimeout(() => p.remove(), 750);
    p.addEventListener("animationend", () => p.remove());
  }
}
function complete(taskId, button) {
  const t = state.tasks.find((t) => t.id === taskId);
  if (!t || pending.has(taskId)) return;
  if (t.done) {
    t.done = false;
    delete t.doneAt;
    save();
    render();
    toast("Back on your list.");
    return;
  }
  if (t.conditions.some((c) => !c.done)) {
    openModal("edit", t.id);
    toast("Finish the steps to crush this goal.");
    return;
  }
  pending.add(taskId);
  sorter?.option("disabled", true);
  // Save immediately, even if the page is closed during the effect.
  t.done = true;
  t.doneAt = today() + "T" + new Date().toTimeString().slice(0, 8);
  save();
  const r = button.closest(".task").getBoundingClientRect();
  chime();
  vibrate([45, 35, 90]);
  if (!reducedMotion()) {
    burst(r.x + r.width / 2, r.y + r.height / 2);
    const appWindow = $(".app-window");
    appWindow.classList.remove("completion-shake");
    void appWindow.offsetWidth;
    appWindow.classList.add("completion-shake");
    const reward = document.createElement("span");
    reward.className = "completion-reward";
    reward.textContent = "+1";
    reward.style.left = `${r.x + r.width / 2}px`;
    reward.style.top = `${r.y + r.height / 2}px`;
    $("#particles").append(reward);
    setTimeout(() => reward.remove(), 750);
  }
  button.closest(".task").classList.add("breaking");
  setTimeout(
    () => {
      pending.delete(taskId);
      render();
      toast("+1. Crushed it!");
    },
    reducedMotion() ? 0 : 480,
  );
}
$("#app").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.priority) {
    const task = state.tasks.find((t) => t.id === b.dataset.priority);
    if (!task || pending.has(task.id)) return;
    task.important = !task.important;
    save();
    render();
    document
      .querySelector(`[data-priority="${task.id}"]`)
      ?.focus({ preventScroll: true });
    return;
  }
  if (b.dataset.complete) {
    complete(b.dataset.complete, b);
    return;
  }
  if (b.dataset.detail) {
    openModal("edit", b.dataset.detail);
    return;
  }
  if (b.dataset.tab) {
    tab = b.dataset.tab;
    render();
    return;
  }
  switch (b.dataset.action) {
    case "home":
      filter = "all";
      render();
      break;
    case "history":
      filter = "history";
      render();
      break;
    case "sound":
      state.sound = !state.sound;
      save();
      render();
      if (state.sound) chime();
      break;
    case "goal":
      openModal("goal");
      break;
    case "close":
      closeModal();
      break;
    case "add-condition":
      $("#condition-fields").insertAdjacentHTML("beforeend", conditionField());
      $("#condition-fields")
        .lastElementChild.querySelector("input[type=text]")
        .focus();
      break;
    case "delete":
      state.tasks = state.tasks.filter((t) => t.id !== modal.taskId);
      modal = null;
      save();
      render();
      toast("Task deleted.");
      break;
    case "end":
      openModal("end");
      break;
    case "save-day": {
      const day = {
        date: today(),
        titles: completedToday().map((t) => t.title),
      };
      const idx = state.days.findIndex((d) => d.date === day.date);
      if (idx < 0) state.days.push(day);
      else state.days[idx] = day;
      save();
      modal = null;
      filter = "history";
      render();
      chime();
      toast("Day saved. See you tomorrow.");
      break;
    }
    case "example":
      addTask("Drink a glass of water");
      break;
  }
  if (b.classList.contains("remove-condition"))
    b.closest(".condition-field").remove();
});
$("#app").addEventListener("submit", (e) => {
  e.preventDefault();
  if (e.target.id === "quick-form") {
    const title = $("#quick-input").value.trim();
    if (title) addTask(title);
    else $("#quick-input").focus();
  }
  if (e.target.id === "goal-form") {
    const title = $("#goal-title").value.trim();
    if (!title) return;
    const conditions = [...document.querySelectorAll(".condition-field")]
      .map((row) => ({
        text: row.querySelector("input[type=text]").value.trim(),
        done: row.querySelector("input[type=checkbox]").checked,
      }))
      .filter((c) => c.text);
    const important = $("#goal-important").checked;
    const t = state.tasks.find((t) => t.id === modal.taskId);
    modal = null;
    if (t) {
      t.title = title;
      t.conditions = conditions;
      t.important = important;
      if (t.done && conditions.some((c) => !c.done)) {
        t.done = false;
        delete t.doneAt;
      }
      save();
      render();
      toast("Changes saved.");
    } else addTask(title, conditions, important);
  }
});
$("#app").addEventListener("keydown", (e) => {
  const handle = e.target.closest(".drag-handle");
  if (handle && ["ArrowUp", "ArrowDown"].includes(e.key) && !pending.size) {
    e.preventDefault();
    const tasks = visibleTasks();
    if (tab === "done") tasks.reverse();
    const index = tasks.findIndex((t) => t.id === handle.dataset.drag);
    const target = index + (e.key === "ArrowUp" ? -1 : 1);
    if (index < 0 || target < 0 || target >= tasks.length) return;
    [tasks[index], tasks[target]] = [tasks[target], tasks[index]];
    saveTaskOrder(
      tasks.map((t) => t.id),
      tab === "done",
    );
    render();
    document
      .querySelector(`[data-drag="${handle.dataset.drag}"]`)
      ?.focus({ preventScroll: true });
    toast(`Moved to ${target + 1} of ${tasks.length}.`);
    return;
  }
  if (
    e.target.id === "quick-input" &&
    e.key === "Enter" &&
    !e.shiftKey &&
    !e.isComposing
  ) {
    e.preventDefault();
    $("#quick-form").requestSubmit();
  }
  if (e.key === "Escape" && modal) closeModal();
});
$("#app").addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-backdrop")) closeModal();
});
$("#app").addEventListener("input", (e) => {
  if (e.target.id === "quick-input") draft = e.target.value;
});
render();
if (!storageAvailable) toast("Storage unavailable. Tasks may not be saved.");

// Keep keyboard navigation inside the open retro dialog.
document.addEventListener("keydown", (e) => {
  if (e.key !== "Tab" || !modal) return;
  const nodes = [
    ...document.querySelectorAll(".modal button,.modal input"),
  ].filter((el) => !el.disabled);
  if (!nodes.length) return;
  const first = nodes[0],
    last = nodes.at(-1);
  if (
    e.shiftKey &&
    (document.activeElement === first ||
      !$(".modal").contains(document.activeElement))
  ) {
    e.preventDefault();
    last.focus();
  } else if (
    !e.shiftKey &&
    (document.activeElement === last ||
      !$(".modal").contains(document.activeElement))
  ) {
    e.preventDefault();
    first.focus();
  }
});
