// modified from editor-comment-previews

export default async function ({ addon, console }) {
  const vm = addon.tab.traps.vm;

  const updateStyles = () => {
    previewInner.classList.toggle("sa-show-arg-preview-delay", addon.settings.get("delay") !== "none");
    previewInner.classList.toggle("sa-show-arg-preview-reduce-transparency", true);
    // console.log(addon.settings.get("transparency") / 100);
    previewInner.style.setProperty("--sa-show-arg-preview-transparency", addon.settings.get("transparency") / 100);
    previewInner.classList.toggle("sa-show-arg-preview-fade", !addon.settings.get("reduce-animation"));
  };

  const afterDelay = (cb) => {
    if (!previewInner.classList.contains("sa-show-arg-preview-hidden")) {
      // If not hidden, updating immediately is preferred
      cb();
      return;
    }
    const delay = addon.settings.get("delay");
    if (delay === "long") return setTimeout(cb, 500);
    if (delay === "short") return setTimeout(cb, 200);
    cb();
  };

  let hoveredElement = null;
  let showTimeout = null;
  let mouseX = 0;
  let mouseY = 0;
  let doNotShowUntilMoveMouse = false;

  const previewOuter = document.createElement("div");
  previewOuter.classList.add("sa-show-arg-preview-outer");
  const previewInner = document.createElement("div");
  previewInner.classList.add("sa-show-arg-preview-inner");
  previewInner.classList.add("sa-show-arg-preview-hidden");
  updateStyles();
  addon.settings.addEventListener("change", updateStyles);
  addon.tab.displayNoneWhileDisabled(previewOuter);
  previewOuter.appendChild(previewInner);
  document.body.appendChild(previewOuter);

  const getBlock = (id) => vm.editingTarget.blocks.getBlock(id) || vm.runtime.flyoutBlocks.getBlock(id);

  const getArgument = (arg, call, prototype) => {
    if(!arg) return "%b (null)";

    // Iterate through each input in call.inputs, matching input.name
    if (prototype && prototype.inputs) {
      const data = JSON.parse(prototype.mutation.argumentnames);
      const ids = JSON.parse(prototype.mutation.argumentids);
      for (let id = 0;id < ids.length;id++) {
        const input = call.inputs[ids[id]];

        if (input && input.block === arg.id) {
          // Return the corresponding input.block
          return data[ids.indexOf(input.name)];
        }
      }
    }
  
    return null;
  };

  const getProcedurePrototypeBlock = (procCode) => {
    const procedurePrototype = Object.values(vm.editingTarget.blocks._blocks).find(
      (i) => i.opcode === "procedures_prototype" && i.mutation.proccode === procCode
    );
    return procedurePrototype ? procedurePrototype : null;
  };

  const setText = (text) => {
    previewInner.innerText = text;
    previewInner.classList.remove("sa-show-arg-preview-hidden");
    updateMousePosition();
  };

  const updateMousePosition = () => {
    previewOuter.style.transform = `translate(${mouseX + 8}px, ${mouseY + 8}px)`;
  };

  const hidePreview = () => {
    if (hoveredElement) {
      hoveredElement = null;
      previewInner.classList.add("sa-show-arg-preview-hidden");
    }
  };

  document.addEventListener("mouseover", (e) => {
    if (addon.self.disabled) {
      return;
    }
    clearTimeout(showTimeout);
    if (doNotShowUntilMoveMouse) {
      return;
    }

    const ea = e.target.closest(".blocklyBubbleCanvas > g, [data-argument-type]");
    if (ea === hoveredElement) {
      // Nothing to do.
      return;
    }
    if (!ea) {
      hidePreview();
      return;
    }

    let text = null;
    const argBlock = getBlock(ea.dataset.id);
    const el = e.target.closest(".blocklyBlockCanvas .blocklyDraggable[data-id]");
    if (el) {
      const id = el.dataset.id;
      const block = getBlock(id);
      if (block && block.opcode === "procedures_call") {
        const procCode = block.mutation.proccode;
        const procedurePrototypeBlock = getProcedurePrototypeBlock(procCode);
        const procedureArgument = getArgument(argBlock, block, procedurePrototypeBlock);
        if (procedureArgument) {
          text = procedureArgument;
        }
      }
    }
    
    if (text !== null && text.trim() !== "") {
      showTimeout = afterDelay(() => {
        hoveredElement = el;
        setText(text);
      });
    } else {
      hidePreview();
    }
  });

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    doNotShowUntilMoveMouse = false;
    if (addon.settings.get("follow-mouse") && !previewInner.classList.contains("sa-show-arg-preview-hidden")) {
      updateMousePosition();
    }
  });

  document.addEventListener(
    "mousedown",
    () => {
      hidePreview();
      doNotShowUntilMoveMouse = true;
    },
    {
      capture: true,
    }
  );
}