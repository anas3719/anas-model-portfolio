(function () {
  "use strict";

  const repository = {
    owner: "anas3719",
    name: "anas-model-portfolio",
    branch: "main",
  };

  const castPagePaths = [
    "cast.html",
    "cast-men.html",
    "cast-women.html",
    "cast-boys.html",
    "cast-girls.html",
    "cast-senior-men.html",
    "cast-senior-women.html",
  ];

  const photographerPagePaths = ["photographers.html"];

  const categories = {
    men: "شباب",
    women: "بنات",
    boys: "أطفال أولاد",
    girls: "أطفال بنات",
    seniorMen: "كبار سن رجال",
    seniorWomen: "كبار سن سيدات",
    photographers: "مصورين",
  };

  const propertyOrder = [
    "id",
    "name",
    "category",
    "folderUrl",
    "photoUrl",
    "imageTitle",
    "age",
    "height",
    "weight",
    "nationality",
    "speaking",
    "pinnedOrder",
    "completedOrder",
    "note",
  ];

  const elements = {
    syncStatus: document.querySelector("#sync-status"),
    reloadData: document.querySelector("#reload-data"),
    githubConnect: document.querySelector("#github-connect"),
    publishChanges: document.querySelector("#publish-changes"),
    profileSearch: document.querySelector("#profile-search"),
    categoryFilter: document.querySelector("#category-filter"),
    profilesCount: document.querySelector("#profiles-count"),
    profilesList: document.querySelector("#profiles-list"),
    emptyList: document.querySelector("#empty-list"),
    addProfile: document.querySelector("#add-profile"),
    emptyAddProfile: document.querySelector("#empty-add-profile"),
    editorEmpty: document.querySelector("#editor-empty"),
    editorPanel: document.querySelector(".editor-panel"),
    profileForm: document.querySelector("#profile-form"),
    editorMode: document.querySelector("#editor-mode"),
    editorTitle: document.querySelector("#editor-title"),
    completionStatus: document.querySelector("#completion-status"),
    profilePreview: document.querySelector("#profile-preview"),
    photoPlaceholder: document.querySelector("#photo-placeholder"),
    profileName: document.querySelector("#profile-name"),
    profileCategory: document.querySelector("#profile-category"),
    profileFolder: document.querySelector("#profile-folder"),
    profilePhoto: document.querySelector("#profile-photo"),
    profileAge: document.querySelector("#profile-age"),
    profileHeight: document.querySelector("#profile-height"),
    profileWeight: document.querySelector("#profile-weight"),
    profileNationality: document.querySelector("#profile-nationality"),
    profileSpeaking: document.querySelector("#profile-speaking"),
    profileNote: document.querySelector("#profile-note"),
    deleteProfile: document.querySelector("#delete-profile"),
    cancelEdit: document.querySelector("#cancel-edit"),
    githubDialog: document.querySelector("#github-dialog"),
    githubForm: document.querySelector("#github-form"),
    githubToken: document.querySelector("#github-token"),
    rememberToken: document.querySelector("#remember-token"),
    githubError: document.querySelector("#github-error"),
    confirmGithub: document.querySelector("#confirm-github"),
    closeGithubDialog: document.querySelector("#close-github-dialog"),
    cancelGithub: document.querySelector("#cancel-github"),
    toggleToken: document.querySelector("#toggle-token"),
    deleteDialog: document.querySelector("#delete-dialog"),
    deleteProfileName: document.querySelector("#delete-profile-name"),
    cancelDelete: document.querySelector("#cancel-delete"),
    confirmDelete: document.querySelector("#confirm-delete"),
    toast: document.querySelector("#toast"),
  };

  let members = [];
  let selectedId = null;
  let isNewProfile = false;
  let dataDirty = false;
  let formDirty = false;
  let baseDataSource = "";
  let basePhotographersSource = "";
  let githubToken = sessionStorage.getItem("cast-admin-github-token") || "";
  let publishAfterConnection = false;
  let toastTimer = null;

  function initializeIcons() {
    if (window.lucide) {
      window.lucide.createIcons({ attrs: { "aria-hidden": "true" } });
    }
  }

  function setSyncStatus(message, state = "") {
    elements.syncStatus.textContent = message;
    if (state) {
      elements.syncStatus.dataset.state = state;
    } else {
      delete elements.syncStatus.dataset.state;
    }
  }

  function setBusy(isBusy) {
    document.body.classList.toggle("is-busy", isBusy);
    elements.publishChanges.disabled = isBusy || !dataDirty || formDirty;
  }

  function showToast(message, state = "") {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    if (state) {
      elements.toast.dataset.state = state;
    } else {
      delete elements.toast.dataset.state;
    }
    toastTimer = window.setTimeout(() => {
      elements.toast.hidden = true;
    }, 4200);
  }

  function cloneMembers(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isComplete(member) {
    if (member.category === "photographers") {
      return ["name", "folderUrl", "photoUrl"].every((key) => String(member[key] || "").trim());
    }

    const requiredFields = ["boys", "girls"].includes(member.category)
      ? ["age", "height", "weight", "nationality"]
      : ["age", "height", "weight", "nationality", "speaking"];

    return requiredFields.every((key) => String(member[key] || "").trim());
  }

  function getAlwaysFirstOrder(member) {
    if (member.category === "women" && member.id === "walaa") return 1;
    if (member.category === "women" && member.id === "lara") return 2;
    if (member.category === "women" && member.id === "raghd") return 3;
    return Number.MAX_SAFE_INTEGER;
  }

  function getAlwaysLastOrder(member) {
    return member.category === "women" && member.id === "modhi-abdullah" ? 1 : 0;
  }

  function getNumericOrder(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function getDisplayOrderedMembers(sourceMembers) {
    return sourceMembers
      .map((member, index) => ({ member, index }))
      .sort((first, second) => {
        const categoryDifference = Object.keys(categories).indexOf(first.member.category)
          - Object.keys(categories).indexOf(second.member.category);
        if (categoryDifference) return categoryDifference;

        const firstAlways = getAlwaysFirstOrder(first.member);
        const secondAlways = getAlwaysFirstOrder(second.member);
        if (firstAlways !== secondAlways) return firstAlways - secondAlways;

        const lastDifference = getAlwaysLastOrder(first.member) - getAlwaysLastOrder(second.member);
        if (lastDifference) return lastDifference;

        const completionDifference = Number(isComplete(second.member)) - Number(isComplete(first.member));
        if (completionDifference) return completionDifference;

        const pinnedDifference = getNumericOrder(first.member.pinnedOrder, Number.MAX_SAFE_INTEGER)
          - getNumericOrder(second.member.pinnedOrder, Number.MAX_SAFE_INTEGER);
        if (pinnedDifference) return pinnedDifference;

        if (isComplete(first.member) && isComplete(second.member)) {
          const completionOrderDifference = getNumericOrder(
            first.member.completedOrder,
            Number.MAX_SAFE_INTEGER + first.index,
          ) - getNumericOrder(
            second.member.completedOrder,
            Number.MAX_SAFE_INTEGER + second.index,
          );
          if (completionOrderDifference) return completionOrderDifference;
        }

        return first.index - second.index;
      })
      .map(({ member }) => member);
  }

  function extractDriveFileId(value) {
    const input = String(value || "").trim();
    if (!input) return "";
    if (/^[A-Za-z0-9_-]{20,}$/.test(input)) return input;

    try {
      const url = new URL(input);
      const queryId = url.searchParams.get("id");
      if (queryId) return queryId;

      const fileMatch = url.pathname.match(/\/d\/([A-Za-z0-9_-]+)/);
      if (fileMatch) return fileMatch[1];
    } catch (error) {
      return "";
    }

    return "";
  }

  function normalizePhotoUrl(value) {
    const input = String(value || "").trim();
    const driveId = extractDriveFileId(input);
    return driveId
      ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`
      : input;
  }

  function getDisplayPhotoUrl(value) {
    const input = String(value || "").trim();
    if (!input) return "";
    const driveId = extractDriveFileId(input);
    return driveId
      ? `https://lh3.googleusercontent.com/d/${driveId}=w1000`
      : input;
  }

  function updatePhotoPreview() {
    const url = getDisplayPhotoUrl(elements.profilePhoto.value);
    elements.profilePreview.hidden = !url;
    elements.photoPlaceholder.hidden = Boolean(url);
    elements.profilePreview.src = url;
  }

  function updateCompletionPreview() {
    const draft = readFormValues(false);
    const complete = isComplete(draft);
    elements.completionStatus.textContent = complete ? "البيانات مكتملة" : "بيانات ناقصة";
    elements.completionStatus.classList.toggle("is-complete", complete);
  }

  function updateCategoryForm() {
    const photographer = elements.profileCategory.value === "photographers";
    elements.profileForm.querySelectorAll(".cast-detail-field").forEach((field) => {
      field.hidden = photographer;
    });
    if (isNewProfile) {
      elements.editorTitle.textContent = photographer ? "إضافة مصور" : "إضافة كاست";
    }
  }

  function createProfileRow(member) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "profile-row";
    row.dataset.profileId = member.id;
    row.classList.toggle("is-selected", member.id === selectedId);

    const imageUrl = getDisplayPhotoUrl(member.photoUrl);
    if (imageUrl) {
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = "";
      image.loading = "lazy";
      row.append(image);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "profile-row-placeholder";
      placeholder.innerHTML = '<i data-lucide="user-round" aria-hidden="true"></i>';
      row.append(placeholder);
    }

    const copy = document.createElement("span");
    copy.className = "profile-row-copy";

    const name = document.createElement("span");
    name.className = "profile-row-name";
    name.textContent = member.name;

    const category = document.createElement("span");
    category.className = "profile-row-category";
    category.textContent = categories[member.category] || member.category;

    copy.append(name, category);

    const state = document.createElement("span");
    const complete = isComplete(member);
    state.className = `profile-state${complete ? " is-complete" : ""}`;
    state.textContent = complete ? "مكتمل" : "ناقص";

    row.append(copy, state);
    row.addEventListener("click", () => selectProfile(member.id));
    return row;
  }

  function renderProfiles() {
    const query = elements.profileSearch.value.trim().toLocaleLowerCase("ar");
    const category = elements.categoryFilter.value;
    const filtered = getDisplayOrderedMembers(members).filter((member) => {
      const matchesCategory = category === "all" || member.category === category;
      const matchesQuery = !query || member.name.toLocaleLowerCase("ar").includes(query);
      return matchesCategory && matchesQuery;
    });

    elements.profilesList.replaceChildren(...filtered.map(createProfileRow));
    elements.emptyList.hidden = filtered.length > 0;
    elements.profilesCount.textContent = `${filtered.length} ملف`;
    initializeIcons();
  }

  function showEditor() {
    elements.editorEmpty.hidden = true;
    elements.profileForm.hidden = false;
  }

  function showEmptyEditor() {
    elements.profileForm.hidden = true;
    elements.editorEmpty.hidden = false;
  }

  function focusEditorOnSmallScreens() {
    if (!window.matchMedia("(max-width: 980px)").matches) return;
    window.requestAnimationFrame(() => {
      elements.editorPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function resetValidation() {
    elements.profileForm.querySelectorAll(".is-invalid").forEach((field) => {
      field.classList.remove("is-invalid");
    });
  }

  function fillForm(member) {
    resetValidation();
    elements.profileName.value = member.name || "";
    elements.profileCategory.value = member.category || "men";
    elements.profileFolder.value = member.folderUrl || "";
    elements.profilePhoto.value = member.photoUrl || "";
    elements.profileAge.value = member.age || "";
    elements.profileHeight.value = member.height || "";
    elements.profileWeight.value = member.weight || "";
    elements.profileNationality.value = member.nationality || "";
    elements.profileSpeaking.value = member.speaking || "";
    elements.profileNote.value = member.note || "";
    updateCategoryForm();
    updatePhotoPreview();
    updateCompletionPreview();
    formDirty = false;
    elements.publishChanges.disabled = !dataDirty;
  }

  function confirmDiscardForm() {
    return !formDirty || window.confirm("لديك تعديل غير محفوظ. هل تريد تركه؟");
  }

  function selectProfile(id) {
    if (!confirmDiscardForm()) return;
    const member = members.find((item) => item.id === id);
    if (!member) return;

    selectedId = id;
    isNewProfile = false;
    elements.editorMode.textContent = "تعديل البروفايل";
    elements.editorTitle.textContent = member.name;
    elements.deleteProfile.hidden = false;
    fillForm(member);
    showEditor();
    renderProfiles();
    focusEditorOnSmallScreens();
  }

  function startNewProfile() {
    if (!confirmDiscardForm()) return;
    selectedId = null;
    isNewProfile = true;
    elements.editorMode.textContent = "بروفايل جديد";
    elements.editorTitle.textContent = "إضافة كاست";
    elements.deleteProfile.hidden = true;
    fillForm({ category: elements.categoryFilter.value === "all" ? "men" : elements.categoryFilter.value });
    showEditor();
    renderProfiles();
    elements.profileName.focus();
    focusEditorOnSmallScreens();
  }

  function readFormValues(includeMetadata = true) {
    const current = includeMetadata && selectedId
      ? members.find((member) => member.id === selectedId) || {}
      : {};

    return {
      ...current,
      name: elements.profileName.value.trim(),
      category: elements.profileCategory.value,
      folderUrl: elements.profileFolder.value.trim(),
      photoUrl: normalizePhotoUrl(elements.profilePhoto.value),
      age: elements.profileAge.value.trim(),
      height: elements.profileHeight.value.trim(),
      weight: elements.profileWeight.value.trim(),
      nationality: elements.profileNationality.value.trim(),
      speaking: elements.profileSpeaking.value,
      note: elements.profileNote.value.trim(),
    };
  }

  function createProfileId() {
    return `cast-${Date.now().toString(36)}`;
  }

  function getNextCompletionOrder() {
    return members.reduce((highest, member) => {
      const order = Number(member.completedOrder);
      return Number.isFinite(order) ? Math.max(highest, order) : highest;
    }, 0) + 1;
  }

  function validateProfile(profile) {
    resetValidation();
    const required = [
      [elements.profileName, profile.name],
      [elements.profileCategory, profile.category],
      [elements.profileFolder, profile.folderUrl],
      [elements.profilePhoto, profile.photoUrl],
    ];

    let valid = true;
    required.forEach(([field, value]) => {
      if (!String(value || "").trim()) {
        field.classList.add("is-invalid");
        valid = false;
      }
    });

    if (!valid) {
      showToast("أكمل الاسم والقسم وروابط المجلد والصورة", "error");
    }
    return valid;
  }

  function markDataDirty(message = "لديك تغييرات غير منشورة") {
    dataDirty = true;
    formDirty = false;
    elements.publishChanges.disabled = false;
    setSyncStatus(message, "dirty");
  }

  function saveProfile(event) {
    event.preventDefault();
    const profile = readFormValues(true);
    if (!validateProfile(profile)) return;

    if (isNewProfile) {
      profile.id = createProfileId();
      profile.imageTitle = "صورة البروفايل";
      if (profile.category !== "photographers" && isComplete(profile)) {
        profile.completedOrder = getNextCompletionOrder();
      }
      members.push(profile);
      selectedId = profile.id;
      isNewProfile = false;
    } else {
      const index = members.findIndex((member) => member.id === selectedId);
      if (index < 0) return;
      if (
        profile.category !== "photographers"
        && isComplete(profile)
        && !Number.isFinite(Number(profile.completedOrder))
      ) {
        profile.completedOrder = getNextCompletionOrder();
      }
      members[index] = profile;
    }

    elements.editorMode.textContent = "تعديل البروفايل";
    elements.editorTitle.textContent = profile.name;
    elements.deleteProfile.hidden = false;
    fillForm(profile);
    markDataDirty("تم حفظ البروفايل كمسودة");
    renderProfiles();
    showToast("تم حفظ البروفايل. اضغط نشر التغييرات", "success");
  }

  function requestDelete() {
    const member = members.find((item) => item.id === selectedId);
    if (!member) return;
    elements.deleteProfileName.textContent = member.name;
    elements.deleteDialog.showModal();
  }

  function confirmDelete() {
    const member = members.find((item) => item.id === selectedId);
    if (!member) return;
    members = members.filter((item) => item.id !== selectedId);
    selectedId = null;
    formDirty = false;
    elements.deleteDialog.close();
    showEmptyEditor();
    markDataDirty(`تم حذف ${member.name} من المسودة`);
    renderProfiles();
    showToast("تم حذف البروفايل من المسودة", "success");
  }

  function serializeValue(value) {
    return JSON.stringify(value);
  }

  function serializeKey(key) {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
  }

  function serializeMembers(sourceMembers) {
    const blocks = sourceMembers.map((member) => {
      const keys = [
        ...propertyOrder.filter((key) => Object.prototype.hasOwnProperty.call(member, key)),
        ...Object.keys(member).filter((key) => !propertyOrder.includes(key)),
      ];
      const lines = keys.map((key) => `    ${serializeKey(key)}: ${serializeValue(member[key])},`);
      return `  {\n${lines.join("\n")}\n  }`;
    });
    return `window.castMembers = [\n${blocks.join(",\n")}\n];\n`;
  }

  function serializePhotographers(sourceMembers) {
    const photographerKeys = ["id", "name", "folderUrl", "photoUrl"];
    const blocks = sourceMembers.map((member) => {
      const lines = photographerKeys.map(
        (key) => `    ${serializeKey(key)}: ${serializeValue(member[key] || "")},`,
      );
      return `  {\n${lines.join("\n")}\n  }`;
    });
    return `window.photographers = [\n${blocks.join(",\n")}\n];\n`;
  }

  function encodeBase64Utf8(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return window.btoa(binary);
  }

  async function githubRequest(path, options = {}) {
    const headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    };

    if (githubToken) headers.Authorization = `Bearer ${githubToken}`;
    const response = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let details = "";
      try {
        const payload = await response.json();
        details = payload.message || "";
      } catch (error) {
        details = "";
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error("رمز GitHub غير صالح أو تنقصه صلاحية Contents: Read and write");
      }
      if (response.status === 409 || response.status === 422) {
        throw new Error("تغيرت نسخة الموقع أثناء التعديل. حدّث البيانات ثم حاول مرة أخرى");
      }
      throw new Error(details || `تعذر الاتصال بـ GitHub (${response.status})`);
    }

    return response.status === 204 ? null : response.json();
  }

  async function fetchGithubRaw(path) {
    const response = await fetch(
      `https://api.github.com/repos/${repository.owner}/${repository.name}/contents/${path}?ref=${repository.branch}`,
      {
        cache: "no-store",
        headers: {
          Accept: "application/vnd.github.raw+json",
          "X-GitHub-Api-Version": "2022-11-28",
          ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
        },
      },
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("تعذر قراءة الملفات. تحقق من صلاحية رمز GitHub");
      }
      throw new Error(`تعذر قراءة ${path}`);
    }
    return response.text();
  }

  async function loadSourceIntoWindow(source) {
    const script = document.createElement("script");
    script.textContent = source;
    document.head.append(script);
    script.remove();
  }

  async function loadData() {
    if (dataDirty && !window.confirm("سيتم تجاهل التغييرات غير المنشورة. هل تريد المتابعة؟")) {
      return;
    }

    setBusy(true);
    setSyncStatus("جاري تحميل البيانات");
    try {
      [baseDataSource, basePhotographersSource] = await Promise.all([
        fetchGithubRaw("cast-data.js"),
        fetchGithubRaw("photographers-data.js"),
      ]);
      await loadSourceIntoWindow(baseDataSource);
      await loadSourceIntoWindow(basePhotographersSource);
      if (!Array.isArray(window.castMembers) || !Array.isArray(window.photographers)) {
        throw new Error("ملفات بيانات البروفايلات غير صالحة");
      }
      members = [
        ...cloneMembers(window.castMembers),
        ...cloneMembers(window.photographers).map((member) => ({ ...member, category: "photographers" })),
      ];
      selectedId = null;
      isNewProfile = false;
      dataDirty = false;
      formDirty = false;
      elements.publishChanges.disabled = true;
      elements.profileSearch.value = "";
      elements.categoryFilter.value = "all";
      showEmptyEditor();
      renderProfiles();
      setSyncStatus("البيانات محدثة", "success");
    } catch (error) {
      setSyncStatus("تعذر تحميل البيانات", "error");
      showToast(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  function updateConnectionButton() {
    const text = elements.githubConnect.querySelector("span");
    text.textContent = githubToken ? "GitHub متصل" : "اتصال GitHub";
    elements.githubConnect.classList.toggle("is-connected", Boolean(githubToken));
  }

  function openGithubDialog(shouldPublish = false) {
    publishAfterConnection = shouldPublish;
    elements.githubError.hidden = true;
    elements.githubError.textContent = "";
    elements.githubToken.value = githubToken;
    elements.githubDialog.showModal();
    elements.githubToken.focus();
  }

  async function connectGithub(event) {
    event.preventDefault();
    const token = elements.githubToken.value.trim();
    if (!token) return;

    const previousToken = githubToken;
    githubToken = token;
    elements.confirmGithub.disabled = true;
    elements.githubError.hidden = true;
    try {
      await githubRequest(`/repos/${repository.owner}/${repository.name}`);
      if (elements.rememberToken.checked) {
        sessionStorage.setItem("cast-admin-github-token", githubToken);
      } else {
        sessionStorage.removeItem("cast-admin-github-token");
      }
      updateConnectionButton();
      elements.githubDialog.close();
      showToast("تم الاتصال بـ GitHub", "success");
      if (publishAfterConnection) await publishChanges();
    } catch (error) {
      githubToken = previousToken;
      elements.githubError.textContent = error.message;
      elements.githubError.hidden = false;
    } finally {
      elements.confirmGithub.disabled = false;
      publishAfterConnection = false;
    }
  }

  function createVersion() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  }

  function updateAssetVersion(html, version) {
    return html.replace(
      /(cast-styles\.css|cast-data\.js|cast\.js)\?v=[^"']+/g,
      `$1?v=${version}`,
    );
  }

  async function createBlob(content) {
    return githubRequest(
      `/repos/${repository.owner}/${repository.name}/git/blobs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: encodeBase64Utf8(content), encoding: "base64" }),
      },
    );
  }

  async function waitForPublicData(expectedSource, expectedPhotographersSource, commitSha) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        const [castResponse, photographersResponse] = await Promise.all([
          fetch(`cast-data.js?admin=${commitSha}-${attempt}`, { cache: "no-store" }),
          fetch(`photographers-data.js?admin=${commitSha}-${attempt}`, { cache: "no-store" }),
        ]);
        const [source, photographersSource] = await Promise.all([
          castResponse.text(),
          photographersResponse.text(),
        ]);
        if (source === expectedSource && photographersSource === expectedPhotographersSource) {
          return true;
        }
      } catch (error) {
        // GitHub Pages may briefly return the previous deployment.
      }
      await new Promise((resolve) => window.setTimeout(resolve, 3000));
    }
    return false;
  }

  async function publishChanges() {
    if (formDirty) {
      showToast("احفظ تعديل البروفايل أولاً", "error");
      return;
    }
    if (!dataDirty) return;
    if (!githubToken) {
      openGithubDialog(true);
      return;
    }

    setBusy(true);
    setSyncStatus("جاري تجهيز النشر");
    try {
      const [remoteDataSource, remotePhotographersSource] = await Promise.all([
        fetchGithubRaw("cast-data.js"),
        fetchGithubRaw("photographers-data.js"),
      ]);
      if (remoteDataSource !== baseDataSource || remotePhotographersSource !== basePhotographersSource) {
        throw new Error("تغيرت بيانات الموقع منذ فتح اللوحة. اضغط تحديث البيانات ثم أعد تعديلك");
      }

      const nextDataSource = serializeMembers(members.filter((member) => member.category !== "photographers"));
      const nextPhotographersSource = serializePhotographers(
        members.filter((member) => member.category === "photographers"),
      );
      const version = createVersion();
      const ref = await githubRequest(
        `/repos/${repository.owner}/${repository.name}/git/ref/heads/${repository.branch}`,
      );
      const currentCommit = await githubRequest(
        `/repos/${repository.owner}/${repository.name}/git/commits/${ref.object.sha}`,
      );

      const htmlSources = await Promise.all(
        castPagePaths.map(async (path) => ({
          path,
          content: updateAssetVersion(await fetchGithubRaw(path), version),
        })),
      );
      const photographerHtmlSources = await Promise.all(
        photographerPagePaths.map(async (path) => ({
          path,
          content: (await fetchGithubRaw(path)).replace(
            /(cast-styles\.css|photographers-data\.js|photographers\.js)\?v=[^"']+/g,
            `$1?v=${version}`,
          ),
        })),
      );

      setSyncStatus("جاري رفع التغييرات");
      const files = [
        { path: "cast-data.js", content: nextDataSource },
        { path: "photographers-data.js", content: nextPhotographersSource },
        ...htmlSources,
        ...photographerHtmlSources,
      ];
      const blobs = await Promise.all(
        files.map(async (file) => ({ ...file, blob: await createBlob(file.content) })),
      );
      const tree = await githubRequest(
        `/repos/${repository.owner}/${repository.name}/git/trees`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base_tree: currentCommit.tree.sha,
            tree: blobs.map((file) => ({
              path: file.path,
              mode: "100644",
              type: "blob",
              sha: file.blob.sha,
            })),
          }),
        },
      );

      const commit = await githubRequest(
        `/repos/${repository.owner}/${repository.name}/git/commits`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "Update cast profiles from admin panel",
            tree: tree.sha,
            parents: [ref.object.sha],
          }),
        },
      );

      await githubRequest(
        `/repos/${repository.owner}/${repository.name}/git/refs/heads/${repository.branch}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sha: commit.sha, force: false }),
        },
      );

      baseDataSource = nextDataSource;
      basePhotographersSource = nextPhotographersSource;
      dataDirty = false;
      elements.publishChanges.disabled = true;
      setSyncStatus("جاري نشر الموقع");
      const deployed = await waitForPublicData(nextDataSource, nextPhotographersSource, commit.sha);
      if (deployed) {
        setSyncStatus("تم النشر بنجاح", "success");
        showToast("تم نشر التغييرات على الموقع", "success");
      } else {
        setSyncStatus("تم الرفع والنشر قيد الاكتمال", "dirty");
        showToast("تم الرفع إلى GitHub، وقد يستغرق ظهور التحديث دقيقة", "success");
      }
    } catch (error) {
      setSyncStatus("تعذر نشر التغييرات", "error");
      showToast(error.message, "error");
      if (/رمز GitHub|صلاحية/.test(error.message)) {
        githubToken = "";
        sessionStorage.removeItem("cast-admin-github-token");
        updateConnectionButton();
      }
    } finally {
      setBusy(false);
    }
  }

  function handleFormInput() {
    formDirty = true;
    elements.publishChanges.disabled = true;
    setSyncStatus("تعديل البروفايل غير محفوظ", "dirty");
    updateCompletionPreview();
  }

  elements.profileSearch.addEventListener("input", renderProfiles);
  elements.categoryFilter.addEventListener("change", renderProfiles);
  elements.addProfile.addEventListener("click", startNewProfile);
  elements.emptyAddProfile.addEventListener("click", startNewProfile);
  elements.profileForm.addEventListener("submit", saveProfile);
  elements.profileForm.addEventListener("input", handleFormInput);
  elements.profileCategory.addEventListener("change", handleFormInput);
  elements.profileCategory.addEventListener("change", updateCategoryForm);
  elements.profilePhoto.addEventListener("input", updatePhotoPreview);
  elements.profilePreview.addEventListener("error", () => {
    elements.profilePreview.hidden = true;
    elements.photoPlaceholder.hidden = false;
  });
  elements.deleteProfile.addEventListener("click", requestDelete);
  elements.cancelEdit.addEventListener("click", () => {
    if (!confirmDiscardForm()) return;
    formDirty = false;
    selectedId = null;
    isNewProfile = false;
    showEmptyEditor();
    renderProfiles();
    setSyncStatus(dataDirty ? "لديك تغييرات غير منشورة" : "البيانات محدثة", dataDirty ? "dirty" : "success");
  });
  elements.confirmDelete.addEventListener("click", confirmDelete);
  elements.cancelDelete.addEventListener("click", () => elements.deleteDialog.close());
  elements.reloadData.addEventListener("click", loadData);
  elements.publishChanges.addEventListener("click", publishChanges);
  elements.githubConnect.addEventListener("click", () => openGithubDialog(false));
  elements.githubForm.addEventListener("submit", connectGithub);
  elements.closeGithubDialog.addEventListener("click", () => elements.githubDialog.close());
  elements.cancelGithub.addEventListener("click", () => elements.githubDialog.close());
  elements.toggleToken.addEventListener("click", () => {
    const showing = elements.githubToken.type === "text";
    elements.githubToken.type = showing ? "password" : "text";
    elements.toggleToken.setAttribute("aria-label", showing ? "إظهار الرمز" : "إخفاء الرمز");
    elements.toggleToken.innerHTML = `<i data-lucide="${showing ? "eye" : "eye-off"}" aria-hidden="true"></i>`;
    initializeIcons();
  });

  window.addEventListener("beforeunload", (event) => {
    if (!dataDirty && !formDirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  initializeIcons();
  updateConnectionButton();
  loadData();
})();
