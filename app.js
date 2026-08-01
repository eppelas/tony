const state = {
  data: null,
  programFilter: "all",
  conceptQuery: "",
  completedHomework: new Set(),
};

const categoryLabels = {
  all: "все",
  "agent-app": "агентные программы",
  model: "модели",
  creative: "творческие",
  work: "рабочие",
  platform: "платформы",
  voice: "голос",
  connector: "коннекторы",
  workflow: "архитектура",
};

const mapPositions = [
  [50, 10],
  [76, 17],
  [90, 34],
  [87, 60],
  [72, 79],
  [50, 90],
  [27, 80],
  [11, 61],
  [10, 34],
  [25, 17],
  [50, 30],
  [69, 49],
  [50, 67],
  [31, 49],
];

function byId(id) {
  return document.getElementById(id);
}

function node(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "class") element.className = value;
    else if (key === "text") element.textContent = value;
    else if (key === "html") element.innerHTML = value;
    else if (key === "dataset") Object.assign(element.dataset, value);
    else if (key in element && key !== "list") element[key] = value;
    else element.setAttribute(key, value);
  });
  children.filter(Boolean).forEach((child) => element.append(child));
  return element;
}

function formatEvidence(evidence = []) {
  return evidence.join(" · ");
}

function showToast(message) {
  const toast = byId("toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

function renderFlow() {
  const items = state.data.flow.map((item) =>
    node("li", { class: "flow-item" }, [
      node("div", {}, [
        node("strong", { text: item.label }),
        node("small", { text: item.note }),
      ]),
    ]),
  );
  byId("flowList").replaceChildren(...items);
}

function renderMetrics() {
  const items = state.data.metrics.map((item) =>
    node("article", { class: "metric" }, [
      node("span", { class: "metric-label", text: item.label }),
      node("strong", { text: item.value }),
      node("small", { text: item.detail }),
    ]),
  );
  byId("metricGrid").replaceChildren(...items);
}

function renderDefinitions() {
  const items = state.data.definitions.map((item) => {
    const sourceLabel =
      item.sourceKind === "dialogue-definition"
        ? "определено в диалоге"
        : item.sourceKind === "editorial-clarification"
          ? "редакторское уточнение"
          : "синтез по диалогу";
    return node("article", { class: "definition" }, [
      node("h4", { text: item.term }),
      node("p", { text: item.definition }),
      node("div", { class: "definition-meta" }, [
        node("span", { class: "evidence-chip", text: formatEvidence(item.evidence) }),
        node("span", { class: "source-kind", text: sourceLabel }),
      ]),
    ]);
  });
  byId("definitionGrid").replaceChildren(...items);
}

function conceptById(id) {
  return state.data.concepts.find((concept) => concept.id === id);
}

function focusConcept(id) {
  document.querySelectorAll(".map-node").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.conceptId === id);
  });
  const row = document.querySelector(`.concept-row[data-concept-id="${id}"]`);
  if (row) {
    row.open = true;
    row.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function renderConceptMap() {
  const items = state.data.concepts.map((concept, index) => {
    const position = mapPositions[index % mapPositions.length];
    const button = node("button", {
      class: "map-node",
      text: concept.title,
      type: "button",
      dataset: { conceptId: concept.id },
      style: `left:${position[0]}%;top:${position[1]}%`,
      title: `${concept.title}: ${formatEvidence(concept.evidence)}`,
    });
    button.addEventListener("click", () => focusConcept(concept.id));
    return button;
  });
  byId("conceptMap").replaceChildren(...items);
}

function renderConceptList() {
  const query = state.conceptQuery.trim().toLocaleLowerCase("ru");
  const filtered = state.data.concepts.filter((concept) => {
    const relationNames = concept.links.map((id) => conceptById(id)?.title || "").join(" ");
    return [concept.title, concept.summary, relationNames, concept.evidence.join(" ")]
      .join(" ")
      .toLocaleLowerCase("ru")
      .includes(query);
  });

  if (!filtered.length) {
    byId("conceptList").replaceChildren(
      node("div", { class: "empty-state", text: "Совпадений нет. Попробуйте другой термин." }),
    );
    return;
  }

  const rows = filtered.map((concept) => {
    const index = state.data.concepts.findIndex((item) => item.id === concept.id) + 1;
    const relations = concept.links
      .map((id) => conceptById(id))
      .filter(Boolean)
      .map((item) => item.title);
    const row = node("details", {
      class: "concept-row",
      dataset: { conceptId: concept.id },
    }, [
      node("summary", {}, [
        node("span", { class: "concept-index", text: String(index).padStart(2, "0") }),
        node("span", { class: "concept-title", text: concept.title }),
        node("span", { class: "timestamp", text: formatEvidence(concept.evidence) }),
      ]),
      node("div", { class: "concept-body" }, [
        node("p", { text: concept.summary }),
        node("div", { class: "concept-relations" }, [
          node("span", { text: "связи:" }),
          node("span", { text: relations.join(" · ") || "—" }),
        ]),
      ]),
    ]);
    row.addEventListener("toggle", () => {
      if (row.open) {
        document.querySelectorAll(".map-node").forEach((item) => {
          item.classList.toggle("is-active", item.dataset.conceptId === concept.id);
        });
      }
    });
    return row;
  });
  byId("conceptList").replaceChildren(...rows);
}

function renderProgramFilters() {
  const categories = ["all", ...new Set(state.data.programs.map((item) => item.category))];
  const buttons = categories.map((category) => {
    const count =
      category === "all"
        ? state.data.programs.length
        : state.data.programs.filter((item) => item.category === category).length;
    const button = node("button", {
      class: `filter-button${state.programFilter === category ? " is-active" : ""}`,
      text: `${categoryLabels[category] || category} · ${count}`,
      type: "button",
      ariaPressed: String(state.programFilter === category),
    });
    button.addEventListener("click", () => {
      state.programFilter = category;
      renderProgramFilters();
      renderPrograms();
    });
    return button;
  });
  byId("programFilters").replaceChildren(...buttons);
}

function renderPrograms() {
  const filtered = state.data.programs.filter(
    (item) => state.programFilter === "all" || item.category === state.programFilter,
  );
  const rows = filtered.map((item) =>
    node("article", { class: "program-row" }, [
      node("strong", { class: "program-name", text: item.name }),
      node("span", { class: "category-tag", text: item.categoryLabel }),
      node("p", { class: "program-role", text: item.role }),
      node("span", {
        class: "confidence",
        text: item.confidence === "high" ? "уверенно" : "восстановлено",
        dataset: { level: item.confidence },
        title: `Таймкоды: ${formatEvidence(item.evidence)}`,
      }),
    ]),
  );
  byId("programList").replaceChildren(...rows);
}

function renderUseCases() {
  const items = state.data.useCases.map((item, index) =>
    node("article", { class: "use-case" }, [
      node("span", { class: "fig-label", text: `сценарий / ${String(index + 1).padStart(2, "0")}` }),
      node("h3", { text: item.title }),
      node("p", { text: item.description }),
      node("div", { class: "evidence-chip", text: formatEvidence(item.evidence) }),
      node("p", { class: "risk-note" }, [
        node("strong", { text: "безопасный старт · " }),
        document.createTextNode(item.risk),
      ]),
    ]),
  );
  byId("useCaseGrid").replaceChildren(...items);
}

function loadHomeworkProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem("agentModeHomework") || "[]");
    state.completedHomework = new Set(Array.isArray(saved) ? saved : []);
  } catch {
    state.completedHomework = new Set();
  }
}

function saveHomeworkProgress() {
  localStorage.setItem("agentModeHomework", JSON.stringify([...state.completedHomework]));
}

function updateProgress() {
  const total = state.data.homework.length;
  const completed = state.completedHomework.size;
  byId("progressCount").textContent = `${completed} / ${total}`;
  byId("progressBar").style.width = `${(completed / total) * 100}%`;
}

async function copyPrompt(prompt) {
  try {
    await navigator.clipboard.writeText(prompt);
    showToast("Промпт скопирован");
  } catch {
    const textArea = node("textarea", { value: prompt, ariaHidden: "true" });
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.append(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
    showToast("Промпт скопирован");
  }
}

function renderHomework() {
  const cards = state.data.homework.map((item) => {
    const completeButton = node("button", {
      class: "complete-button",
      type: "button",
      text: state.completedHomework.has(item.id) ? "готово ✓" : "отметить готово",
      ariaPressed: String(state.completedHomework.has(item.id)),
    });
    completeButton.addEventListener("click", () => {
      if (state.completedHomework.has(item.id)) state.completedHomework.delete(item.id);
      else state.completedHomework.add(item.id);
      saveHomeworkProgress();
      completeButton.textContent = state.completedHomework.has(item.id) ? "готово ✓" : "отметить готово";
      completeButton.setAttribute("aria-pressed", String(state.completedHomework.has(item.id)));
      updateProgress();
    });

    const copyButton = node("button", {
      class: "copy-button",
      type: "button",
      text: "скопировать промпт",
    });
    copyButton.addEventListener("click", () => copyPrompt(item.prompt));

    return node("details", { class: "homework-card", open: item.order === 1 }, [
      node("summary", {}, [
        node("span", { class: "homework-order", text: String(item.order).padStart(2, "0") }),
        node("span", {}, [
          node("span", { class: "homework-title", text: item.title }),
          node("span", { class: "homework-objective", text: item.objective }),
        ]),
        node("span", { class: "homework-time", text: `${item.minutes} мин` }),
      ]),
      node("div", { class: "homework-body" }, [
        node("ol", { class: "homework-steps" }, item.steps.map((step) => node("li", { text: step }))),
        node("div", { class: "prompt-box" }, [
          node("div", { class: "prompt-toolbar" }, [
            node("span", { text: "готовый промпт" }),
            copyButton,
          ]),
          node("pre", { class: "prompt-text", text: item.prompt }),
        ]),
        node("div", { class: "homework-checks" }, [
          node("span", {}, [node("strong", { text: "артефакт · " }), document.createTextNode(item.artifact)]),
          node("span", {}, [node("strong", { text: "готово, если · " }), document.createTextNode(item.done)]),
          completeButton,
        ]),
      ]),
    ]);
  });
  byId("homeworkList").replaceChildren(...cards);
  updateProgress();
}

function renderDeepChallenges() {
  const items = state.data.deepChallenges.map((item) =>
    node("article", { class: "deep-item" }, [
      node("span", { class: "deep-time", text: `${item.minutes} мин` }),
      node("h4", { text: item.title }),
      node("p", { text: item.description }),
    ]),
  );
  byId("deepChallengeGrid").replaceChildren(...items);
}

function renderTimeline() {
  const items = state.data.timeline.map((item) =>
    node("article", { class: "timeline-item", dataset: { public: item.public } }, [
      node("span", { class: "timeline-time", text: `${item.start}—${item.end}` }),
      node("div", { class: "timeline-copy" }, [
        node("h3", { text: item.title }),
        node("p", { text: item.note }),
      ]),
      node("span", {
        class: "public-state",
        text: item.public === "safe" ? "прямой вывод" : "обезличено",
      }),
    ]),
  );
  byId("timeline").replaceChildren(...items);
}

function renderPrivacy() {
  const privacy = state.data.privacy;
  byId("privacyNote").replaceChildren(
    node("span", { class: "fig-label", text: "privacy boundary" }),
    node("h3", { text: privacy.headline }),
    node("p", { text: privacy.note }),
    node("ul", { class: "excluded-list" }, privacy.excluded.map((item) => node("li", { text: item }))),
  );
}

function wireNavigation() {
  const navLinks = [...document.querySelectorAll(".section-nav a")];
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navLinks.forEach((link) => {
        link.classList.toggle("is-current", link.getAttribute("href") === `#${visible.target.id}`);
      });
    },
    { rootMargin: "-20% 0px -65% 0px", threshold: [0.05, 0.2, 0.5] },
  );
  sections.forEach((section) => observer.observe(section));
}

function wireConceptSearch() {
  byId("conceptSearch").addEventListener("input", (event) => {
    state.conceptQuery = event.target.value;
    renderConceptList();
  });
}

function renderAll() {
  renderFlow();
  renderMetrics();
  renderDefinitions();
  renderConceptMap();
  renderConceptList();
  renderProgramFilters();
  renderPrograms();
  renderUseCases();
  loadHomeworkProgress();
  renderHomework();
  renderDeepChallenges();
  renderTimeline();
  renderPrivacy();
  wireNavigation();
  wireConceptSearch();
}

async function init() {
  try {
    const response = await fetch("./data/dialogue.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();
    renderAll();
  } catch (error) {
    console.error(error);
    byId("main").replaceChildren(
      node("section", { class: "section" }, [
        node("div", {
          class: "empty-state",
          text: "Данные не загрузились. Откройте проект через локальный preview launcher или HTTP-сервер.",
        }),
      ]),
    );
  }
}

init();
