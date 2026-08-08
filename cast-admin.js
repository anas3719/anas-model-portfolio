(function () {
  "use strict";

  const repository = {
    owner: "anas3719",
    name: "anas-model-portfolio",
    branch: "main",
  };

  const castPagePaths = [
    "cast.html",
    "cast-category.html",
    "cast-men.html",
    "cast-women.html",
    "cast-boys.html",
    "cast-girls.html",
    "cast-senior-men.html",
    "cast-senior-women.html",
  ];

  const photographerPagePaths = ["photographers.html"];

  const defaultCategoryColors = {
    start: "#17313a",
    end: "#111427",
    border: "#19f6ff",
    text: "#f4f7ff",
  };

  const officialColorPresets = {
    cast: {
      label: "ألوان الكاست",
      colors: { ...defaultCategoryColors },
    },
    photographers: {
      label: "ألوان المصورين",
      colors: {
        start: "#4a3820",
        end: "#251326",
        border: "#ffce60",
        text: "#fff8e8",
      },
    },
  };

  const protectedCategoryKeys = new Set([
    "men",
    "women",
    "boys",
    "girls",
    "seniorMen",
    "seniorWomen",
    "photographers",
  ]);

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
    "displayOrder",
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
    manageCategories: document.querySelector("#manage-categories"),
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
    categoriesDialog: document.querySelector("#categories-dialog"),
    categoriesForm: document.querySelector("#categories-form"),
    categoriesList: document.querySelector("#categories-list"),
    categoriesError: document.querySelector("#categories-error"),
    addCategory: document.querySelector("#add-category"),
    closeCategoriesDialog: document.querySelector("#close-categories-dialog"),
    cancelCategories: document.querySelector("#cancel-categories"),
    toast: document.querySelector("#toast"),
  };

  let members = [];
  let categoryDefinitions = [];
  let categoryDraft = [];
  let selectedId = null;
  let isNewProfile = false;
  let dataDirty = false;
  let formDirty = false;
  let baseDataSource = "";
  let basePhotographersSource = "";
  let baseCategoriesSource = "";
  let githubToken = sessionStorage.getItem("cast-admin-github-token") || "";
  let publishAfterConnection = false;
  let toastTimer = null;
  let profileSortable = null;
  let categorySortable = null;

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

  function normalizeCategoryDefinitions(value) {
    return (Array.isArray(value) ? value : [])
      .filter((category) => category && category.key && category.label)
      .map((category) => ({
        source: "cast",
        profileType: "full",
        selectable: true,
        group: category.label,
        href: `cast-category.html?category=${encodeURIComponent(category.key)}`,
        ...category,
        colors: { ...defaultCategoryColors, ...(category.colors || {}) },
      }));
  }

  function getCategoryDefinition(key) {
    return categoryDefinitions.find((category) => category.key === key);
  }

  function getCategoryLabel(key) {
    return getCategoryDefinition(key)?.label || key;
  }

  function isSimpleCategory(key) {
    return getCategoryDefinition(key)?.profileType === "simple";
  }

  function syncCategoryOptions() {
    const filterValue = elements.categoryFilter.value || "all";
    const formValue = elements.profileCategory.value;
    const filterOptions = [new Option("كل الأقسام", "all")];
    const formOptions = [];

    categoryDefinitions.forEach((category) => {
      filterOptions.push(new Option(category.label, category.key));
      formOptions.push(new Option(category.label, category.key));
    });

    elements.categoryFilter.replaceChildren(...filterOptions);
    elements.profileCategory.replaceChildren(...formOptions);
    elements.categoryFilter.value = categoryDefinitions.some((category) => category.key === filterValue)
      ? filterValue
      : "all";
    elements.profileCategory.value = categoryDefinitions.some((category) => category.key === formValue)
      ? formValue
      : categoryDefinitions[0]?.key || "";
  }

  function isComplete(member) {
    if (isSimpleCategory(member.category)) {
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
    const categoryOrder = new Map(categoryDefinitions.map((category, index) => [category.key, index]));
    const manualCategories = new Set(
      sourceMembers
        .filter((member) => hasNumericOrder(member.displayOrder))
        .map((member) => member.category),
    );

    return sourceMembers
      .map((member, index) => ({ member, index }))
      .sort((first, second) => {
        const categoryDifference = (categoryOrder.get(first.member.category) ?? Number.MAX_SAFE_INTEGER)
          - (categoryOrder.get(second.member.category) ?? Number.MAX_SAFE_INTEGER);
        if (categoryDifference) return categoryDifference;

        if (manualCategories.has(first.member.category)) {
          const firstOrder = hasNumericOrder(first.member.displayOrder)
            ? Number(first.member.displayOrder)
            : Number.MAX_SAFE_INTEGER + first.index;
          const secondOrder = hasNumericOrder(second.member.displayOrder)
            ? Number(second.member.displayOrder)
            : Number.MAX_SAFE_INTEGER + second.index;
          return firstOrder - secondOrder || first.index - second.index;
        }

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

  function hasNumericOrder(value) {
    return value !== "" && value !== null && value !== undefined && Number.isFinite(Number(value));
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
    const simpleProfile = isSimpleCategory(elements.profileCategory.value);
    elements.profileForm.querySelectorAll(".cast-detail-field").forEach((field) => {
      field.hidden = simpleProfile;
    });
    if (isNewProfile) {
      elements.editorTitle.textContent = simpleProfile ? "إضافة ملف" : "إضافة كاست";
    }
  }

  function createProfileRow(member, canSort) {
    const row = document.createElement("div");
    row.className = "profile-row";
    row.dataset.profileId = member.id;
    row.dataset.categoryKey = member.category;
    row.classList.toggle("is-selected", member.id === selectedId);

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "profile-row__open";
    openButton.setAttribute("aria-label", `تعديل ${member.name}`);

    const imageUrl = getDisplayPhotoUrl(member.photoUrl);
    if (imageUrl) {
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = "";
      image.loading = "lazy";
      openButton.append(image);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "profile-row-placeholder";
      placeholder.innerHTML = '<i data-lucide="user-round" aria-hidden="true"></i>';
      openButton.append(placeholder);
    }

    const copy = document.createElement("span");
    copy.className = "profile-row-copy";

    const name = document.createElement("span");
    name.className = "profile-row-name";
    name.textContent = member.name;

    const category = document.createElement("span");
    category.className = "profile-row-category";
    category.textContent = getCategoryLabel(member.category);

    copy.append(name, category);

    const state = document.createElement("span");
    const complete = isComplete(member);
    state.className = `profile-state${complete ? " is-complete" : ""}`;
    state.textContent = complete ? "مكتمل" : "ناقص";

    const dragHandle = document.createElement("button");
    dragHandle.type = "button";
    dragHandle.className = "profile-drag-handle";
    dragHandle.disabled = !canSort;
    dragHandle.title = canSort ? "اسحب لتغيير الترتيب" : "امسح البحث لتفعيل الترتيب";
    dragHandle.setAttribute("aria-label", `تغيير ترتيب ${member.name}`);
    dragHandle.innerHTML = '<i data-lucide="grip-vertical" aria-hidden="true"></i>';

    openButton.append(copy, state);
    openButton.addEventListener("click", () => selectProfile(member.id));
    row.append(openButton, dragHandle);
    return row;
  }

  function initializeProfileSorting(canSort) {
    if (profileSortable) {
      profileSortable.destroy();
      profileSortable = null;
    }
    if (!canSort || !window.Sortable) return;

    profileSortable = window.Sortable.create(elements.profilesList, {
      animation: 170,
      direction: "vertical",
      handle: ".profile-drag-handle",
      forceFallback: true,
      fallbackTolerance: 3,
      delayOnTouchOnly: true,
      touchStartThreshold: 4,
      swapThreshold: 0.65,
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",
      onMove: (event) => {
        if (elements.categoryFilter.value !== "all") return true;
        const draggedCategory = event.dragged?.dataset.categoryKey;
        const relatedCategory = event.related?.dataset.categoryKey;
        return !relatedCategory || draggedCategory === relatedCategory;
      },
      onEnd: (event) => {
        if (event.oldIndex === event.newIndex) return;

        const rows = [...elements.profilesList.children].filter((row) => row.dataset.profileId);
        const selectedCategory = elements.categoryFilter.value;
        const affectedCategories = selectedCategory === "all"
          ? [...new Set(rows.map((row) => row.dataset.categoryKey))]
          : [selectedCategory];

        affectedCategories.forEach((categoryKey) => {
          rows
            .filter((row) => row.dataset.categoryKey === categoryKey)
            .forEach((row, index) => {
              const member = members.find(
                (item) => item.id === row.dataset.profileId && item.category === categoryKey,
              );
              if (member) member.displayOrder = index + 1;
            });
        });
        markDataDirty("تم حفظ الترتيب كمسودة");
        renderProfiles();
        showToast("تم ترتيب البروفايلات. اضغط نشر التغييرات", "success");
      },
    });
  }

  function renderProfiles() {
    const query = elements.profileSearch.value.trim().toLocaleLowerCase("ar");
    const category = elements.categoryFilter.value;
    const filtered = getDisplayOrderedMembers(members).filter((member) => {
      const matchesCategory = category === "all" || member.category === category;
      const matchesQuery = !query || member.name.toLocaleLowerCase("ar").includes(query);
      return matchesCategory && matchesQuery;
    });
    const canSort = !query && filtered.length > 1;

    elements.profilesList.replaceChildren(...filtered.map((member) => createProfileRow(member, canSort)));
    elements.profilesList.classList.toggle("is-sortable", canSort);
    elements.emptyList.hidden = filtered.length > 0;
    elements.profilesCount.textContent = `${filtered.length} ملف`;
    initializeIcons();
    initializeProfileSorting(canSort);
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
    elements.profileCategory.value = member.category || categoryDefinitions[0]?.key || "";
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
    fillForm({
      category: elements.categoryFilter.value === "all"
        ? categoryDefinitions[0]?.key || ""
        : elements.categoryFilter.value,
    });
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

  function categoryUsesManualOrder(categoryKey) {
    return members.some((member) => member.category === categoryKey && hasNumericOrder(member.displayOrder));
  }

  function getNextDisplayOrder(categoryKey) {
    return members.reduce((highest, member) => {
      if (member.category !== categoryKey || !hasNumericOrder(member.displayOrder)) return highest;
      return Math.max(highest, Number(member.displayOrder));
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
    const previousProfile = selectedId ? members.find((member) => member.id === selectedId) : null;
    const profile = readFormValues(true);
    if (!validateProfile(profile)) return;

    if (isNewProfile) {
      profile.id = createProfileId();
      profile.imageTitle = "صورة البروفايل";
      if (!isSimpleCategory(profile.category) && isComplete(profile)) {
        profile.completedOrder = getNextCompletionOrder();
      }
      if (categoryUsesManualOrder(profile.category)) {
        profile.displayOrder = getNextDisplayOrder(profile.category);
      }
      members.push(profile);
      selectedId = profile.id;
      isNewProfile = false;
    } else {
      const index = members.findIndex((member) => member.id === selectedId);
      if (index < 0) return;
      if (!isSimpleCategory(profile.category) && isComplete(profile) && !hasNumericOrder(profile.completedOrder)) {
        profile.completedOrder = getNextCompletionOrder();
      }
      if (previousProfile && previousProfile.category !== profile.category) {
        delete profile.displayOrder;
        if (categoryUsesManualOrder(profile.category)) {
          profile.displayOrder = getNextDisplayOrder(profile.category);
        }
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
    const photographerKeys = ["id", "name", "folderUrl", "photoUrl", "displayOrder"];
    const blocks = sourceMembers.map((member) => {
      const lines = photographerKeys
        .filter((key) => Object.prototype.hasOwnProperty.call(member, key))
        .map((key) => `    ${serializeKey(key)}: ${serializeValue(member[key])},`);
      return `  {\n${lines.join("\n")}\n  }`;
    });
    return `window.photographers = [\n${blocks.join(",\n")}\n];\n`;
  }

  function serializeCategories(sourceCategories) {
    const categoryKeys = [
      "key",
      "label",
      "group",
      "href",
      "source",
      "profileType",
      "selectable",
      "colors",
    ];
    const blocks = sourceCategories.map((category) => {
      const lines = categoryKeys
        .filter((key) => Object.prototype.hasOwnProperty.call(category, key))
        .map((key) => `    ${serializeKey(key)}: ${serializeValue(category[key])},`);
      return `  {\n${lines.join("\n")}\n  }`;
    });
    return `window.castCategories = [\n${blocks.join(",\n")}\n];\n`;
  }

  function updateCategoryPreview(row, category) {
    const preview = row.querySelector(".category-preview");
    preview.textContent = category.label || "قسم جديد";
    preview.style.setProperty("--preview-start", category.colors.start);
    preview.style.setProperty("--preview-end", category.colors.end);
    preview.style.setProperty("--preview-border", category.colors.border);
    preview.style.setProperty("--preview-text", category.colors.text);
    syncCategoryPresetState(row, category);
  }

  function colorsMatch(first, second) {
    return ["start", "end", "border", "text"].every(
      (key) => String(first[key]).toLowerCase() === String(second[key]).toLowerCase(),
    );
  }

  function syncCategoryPresetState(row, category) {
    row.querySelectorAll(".category-preset").forEach((button) => {
      const preset = officialColorPresets[button.dataset.presetKey];
      const active = preset ? colorsMatch(category.colors, preset.colors) : false;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function applyCategoryPreset(row, category, preset) {
    category.colors = { ...preset.colors };
    row.querySelectorAll("[data-color-key]").forEach((input) => {
      input.value = category.colors[input.dataset.colorKey];
    });
    updateCategoryPreview(row, category);
  }

  function createPresetButton(presetKey, preset, category, row) {
    const button = document.createElement("button");
    const swatches = document.createElement("span");
    const label = document.createElement("span");
    button.type = "button";
    button.className = "category-preset";
    button.dataset.presetKey = presetKey;
    button.title = `تطبيق ${preset.label} الرسمية`;
    swatches.className = "category-preset__swatches";
    Object.values(preset.colors).forEach((color) => {
      const swatch = document.createElement("span");
      swatch.style.backgroundColor = color;
      swatches.append(swatch);
    });
    label.textContent = preset.label;
    button.append(swatches, label);
    button.addEventListener("click", () => applyCategoryPreset(row, category, preset));
    return button;
  }

  function createColorControl(category, key, label, row) {
    const control = document.createElement("label");
    const caption = document.createElement("span");
    const input = document.createElement("input");
    control.className = "color-control";
    caption.textContent = label;
    input.type = "color";
    input.value = category.colors[key];
    input.dataset.colorKey = key;
    input.addEventListener("input", () => {
      category.colors[key] = input.value;
      updateCategoryPreview(row, category);
    });
    control.append(caption, input);
    return control;
  }

  function createCategoryEditorRow(category) {
    const row = document.createElement("div");
    row.className = "category-editor-row";
    row.dataset.categoryKey = category.key;

    const dragHandle = document.createElement("button");
    dragHandle.type = "button";
    dragHandle.className = "category-drag-handle";
    dragHandle.setAttribute("aria-label", `تغيير ترتيب قسم ${category.label}`);
    dragHandle.title = "اسحب لتغيير ترتيب القسم";
    dragHandle.innerHTML = '<i data-lucide="grip-vertical" aria-hidden="true"></i>';

    const preview = document.createElement("div");
    preview.className = "category-preview";

    const nameField = document.createElement("label");
    nameField.className = "category-name-field";
    const nameCaption = document.createElement("span");
    const nameInput = document.createElement("input");
    nameCaption.textContent = "اسم القسم";
    nameInput.type = "text";
    nameInput.value = category.label;
    nameInput.required = true;
    nameInput.addEventListener("input", () => {
      const previousLabel = category.label;
      const nextLabel = nameInput.value.trimStart();
      category.label = nextLabel;
      if (category.group === previousLabel) category.group = nextLabel;
      updateCategoryPreview(row, category);
    });
    nameField.append(nameCaption, nameInput);

    const typeField = document.createElement("label");
    typeField.className = "category-type-field";
    const typeCaption = document.createElement("span");
    const typeSelect = document.createElement("select");
    typeCaption.textContent = "نوع البروفايل";
    typeSelect.append(
      new Option("كاست ببيانات كاملة", "full"),
      new Option("ملف بسيط بالاسم والصورة", "simple"),
    );
    typeSelect.value = category.profileType;
    typeSelect.disabled = category.source === "photographers";
    typeSelect.addEventListener("change", () => {
      category.profileType = typeSelect.value;
    });
    typeField.append(typeCaption, typeSelect);

    const colorSettings = document.createElement("div");
    const presets = document.createElement("div");
    const colors = document.createElement("div");
    colorSettings.className = "category-color-settings";
    presets.className = "category-presets";
    colors.className = "category-colors";
    Object.entries(officialColorPresets).forEach(([presetKey, preset]) => {
      presets.append(createPresetButton(presetKey, preset, category, row));
    });
    const colorsCaption = document.createElement("span");
    colorsCaption.textContent = "ألوان البلوك والبطاقات";
    colors.append(
      colorsCaption,
      createColorControl(category, "start", "البداية", row),
      createColorControl(category, "end", "النهاية", row),
      createColorControl(category, "border", "الإطار", row),
      createColorControl(category, "text", "النص", row),
    );
    colorSettings.append(presets, colors);

    const removeButton = document.createElement("button");
    const hasProfiles = members.some((member) => member.category === category.key);
    const protectedCategory = protectedCategoryKeys.has(category.key);
    removeButton.type = "button";
    removeButton.className = "icon-button category-delete";
    removeButton.disabled = protectedCategory || hasProfiles;
    removeButton.title = protectedCategory
      ? "يمكن تعديل هذا القسم وترتيبه ولا يمكن حذفه"
      : hasProfiles
        ? "انقل بروفايلات القسم قبل حذفه"
        : "حذف القسم";
    removeButton.setAttribute("aria-label", `حذف قسم ${category.label}`);
    removeButton.innerHTML = '<i data-lucide="trash-2" aria-hidden="true"></i>';
    removeButton.addEventListener("click", () => {
      categoryDraft = categoryDraft.filter((item) => item.key !== category.key);
      renderCategoryEditor();
    });

    row.append(dragHandle, preview, nameField, typeField, colorSettings, removeButton);
    updateCategoryPreview(row, category);
    return row;
  }

  function initializeCategorySorting() {
    if (categorySortable) {
      categorySortable.destroy();
      categorySortable = null;
    }
    if (!window.Sortable) return;
    categorySortable = window.Sortable.create(elements.categoriesList, {
      animation: 170,
      direction: "vertical",
      handle: ".category-drag-handle",
      forceFallback: true,
      fallbackTolerance: 3,
      delayOnTouchOnly: true,
      touchStartThreshold: 4,
      swapThreshold: 0.65,
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",
      onEnd: () => {
        const order = [...elements.categoriesList.children].map((row) => row.dataset.categoryKey);
        categoryDraft.sort((first, second) => order.indexOf(first.key) - order.indexOf(second.key));
      },
    });
  }

  function renderCategoryEditor() {
    elements.categoriesList.replaceChildren(...categoryDraft.map(createCategoryEditorRow));
    initializeIcons();
    initializeCategorySorting();
  }

  function openCategoryManager() {
    categoryDraft = cloneMembers(categoryDefinitions);
    elements.categoriesError.hidden = true;
    elements.categoriesError.textContent = "";
    renderCategoryEditor();
    elements.categoriesDialog.showModal();
  }

  function addCategoryDraft() {
    const key = `section-${Date.now().toString(36)}`;
    categoryDraft.push({
      key,
      label: "قسم جديد",
      group: "قسم جديد",
      href: `cast-category.html?category=${encodeURIComponent(key)}`,
      source: "cast",
      profileType: "full",
      selectable: true,
      colors: { ...defaultCategoryColors },
    });
    renderCategoryEditor();
    elements.categoriesList.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function saveCategorySettings(event) {
    event.preventDefault();
    const labels = categoryDraft.map((category) => category.label.trim());
    if (labels.some((label) => !label)) {
      elements.categoriesError.textContent = "اكتب اسمًا لكل قسم";
      elements.categoriesError.hidden = false;
      return;
    }
    if (new Set(labels).size !== labels.length) {
      elements.categoriesError.textContent = "أسماء الأقسام يجب أن تكون مختلفة";
      elements.categoriesError.hidden = false;
      return;
    }

    categoryDraft.forEach((category) => {
      category.label = category.label.trim();
      if (!category.group || category.group === "قسم جديد") category.group = category.label;
    });
    categoryDefinitions = normalizeCategoryDefinitions(cloneMembers(categoryDraft));
    syncCategoryOptions();
    if (selectedId) fillForm(members.find((member) => member.id === selectedId) || {});
    renderProfiles();
    elements.categoriesDialog.close();
    markDataDirty("تم حفظ الأقسام كمسودة");
    showToast("تم حفظ الأقسام والألوان. اضغط نشر التغييرات", "success");
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
      [baseDataSource, basePhotographersSource, baseCategoriesSource] = await Promise.all([
        fetchGithubRaw("cast-data.js"),
        fetchGithubRaw("photographers-data.js"),
        fetchGithubRaw("cast-categories.js").catch((error) => {
          if (Array.isArray(window.castCategories) && window.castCategories.length) {
            return serializeCategories(normalizeCategoryDefinitions(window.castCategories));
          }
          throw error;
        }),
      ]);
      await loadSourceIntoWindow(baseDataSource);
      await loadSourceIntoWindow(basePhotographersSource);
      await loadSourceIntoWindow(baseCategoriesSource);
      if (
        !Array.isArray(window.castMembers)
        || !Array.isArray(window.photographers)
        || !Array.isArray(window.castCategories)
      ) {
        throw new Error("ملفات بيانات البروفايلات غير صالحة");
      }
      categoryDefinitions = normalizeCategoryDefinitions(cloneMembers(window.castCategories));
      syncCategoryOptions();
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
      /(cast-styles\.css|cast-categories\.js|cast-data\.js|photographers-data\.js|cast\.js)\?v=[^"']+/g,
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

  async function waitForPublicData(
    expectedSource,
    expectedPhotographersSource,
    expectedCategoriesSource,
    commitSha,
  ) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        const [castResponse, photographersResponse, categoriesResponse] = await Promise.all([
          fetch(`cast-data.js?admin=${commitSha}-${attempt}`, { cache: "no-store" }),
          fetch(`photographers-data.js?admin=${commitSha}-${attempt}`, { cache: "no-store" }),
          fetch(`cast-categories.js?admin=${commitSha}-${attempt}`, { cache: "no-store" }),
        ]);
        const [source, photographersSource, categoriesSource] = await Promise.all([
          castResponse.text(),
          photographersResponse.text(),
          categoriesResponse.text(),
        ]);
        if (
          source === expectedSource
          && photographersSource === expectedPhotographersSource
          && categoriesSource === expectedCategoriesSource
        ) {
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
      const [remoteDataSource, remotePhotographersSource, remoteCategoriesSource] = await Promise.all([
        fetchGithubRaw("cast-data.js"),
        fetchGithubRaw("photographers-data.js"),
        fetchGithubRaw("cast-categories.js"),
      ]);
      if (
        remoteDataSource !== baseDataSource
        || remotePhotographersSource !== basePhotographersSource
        || remoteCategoriesSource !== baseCategoriesSource
      ) {
        throw new Error("تغيرت بيانات الموقع منذ فتح اللوحة. اضغط تحديث البيانات ثم أعد تعديلك");
      }

      const photographerCategoryKeys = new Set(
        categoryDefinitions
          .filter((category) => category.source === "photographers")
          .map((category) => category.key),
      );
      const nextDataSource = serializeMembers(
        members.filter((member) => !photographerCategoryKeys.has(member.category)),
      );
      const nextPhotographersSource = serializePhotographers(
        members.filter((member) => photographerCategoryKeys.has(member.category)),
      );
      const nextCategoriesSource = serializeCategories(categoryDefinitions);
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
            /(cast-styles\.css|cast-categories\.js|photographers-data\.js|photographers\.js)\?v=[^"']+/g,
            `$1?v=${version}`,
          ),
        })),
      );

      setSyncStatus("جاري رفع التغييرات");
      const files = [
        { path: "cast-data.js", content: nextDataSource },
        { path: "photographers-data.js", content: nextPhotographersSource },
        { path: "cast-categories.js", content: nextCategoriesSource },
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
      baseCategoriesSource = nextCategoriesSource;
      dataDirty = false;
      elements.publishChanges.disabled = true;
      setSyncStatus("جاري نشر الموقع");
      const deployed = await waitForPublicData(
        nextDataSource,
        nextPhotographersSource,
        nextCategoriesSource,
        commit.sha,
      );
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
  elements.manageCategories.addEventListener("click", openCategoryManager);
  elements.categoriesForm.addEventListener("submit", saveCategorySettings);
  elements.addCategory.addEventListener("click", addCategoryDraft);
  elements.closeCategoriesDialog.addEventListener("click", () => elements.categoriesDialog.close());
  elements.cancelCategories.addEventListener("click", () => elements.categoriesDialog.close());
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
