import { updateAllBlocks } from "../custom-block-shape/update-all-blocks.js";

export default async function ({ addon , console }) {
  const ScratchBlocks = await addon.tab.traps.getBlockly();
  const vm = addon.tab.traps.vm;

  // Text input block types that we want to style
  const getType = (block) => {
    // more categories will be added when needed
    const parent = block.getParent();
    if (parent && parent.getCategory()) {
      if (parent.getCategory() === "operators") {
        if (
          parent.type === "operator_equals"
          || parent.type === "operator_lt"
          || parent.type === "operator_gt"
        ) {
          return "math-comparing-input";
        } else if (block.type === "math_number") {
          if (
            parent.type === "operator_add"
            || parent.type === "operator_subtract"
          ) {
            // well, in some cases, we need empties
            return "math-string-input";
          }
          return "math-calculation-input";
        } else if (block.type === "math_whole_number") {
          return "id-input";
        } else if(block.type === "text") {
          return "math-string-input";
        }
        // blocks not found are handled later
      } else if (parent.getCategory() === "data") {
        if (block.type === "math_integer") {
          return "math-calculation-input";
        }
        return "data-input";
      } else if (parent.getCategory() === "data-list") {
        if (block.type === "math_integer" || block.type === "math_whole_number") {
          return "id-input";
        }
        return "data-input";
      } else if (parent.getCategory() === "control") {
        return "control-input";
      } else if (parent.getCategory() === "events") {
        // We consider event blocks to be control blocks
        return "control-input";
      } else if (parent.getCategory() === "sensing") {
        // normally, sensing blocks here are ask blocks
        if (parent.type === "sensing_askandwait") {
          return "ask-input";
        }
        // handle other sensing blocks later
      } else if (parent.getCategory() === "sound") {
        return "sound-input";
      } else if (parent.getCategory() === "looks") {
        if (block.type === "text") {
          return "looks-text-input";
        }
        return "looks-input";
      } else if (parent.getCategory() === "motion") {
        return "motion-input";
      } else {
        return "other-input";
      }
      // unidentified blocks are handled later
    }
    // pen, definition, extensions
    if (parent && parent.type === "procedures_call") {
      return "argument-string-number-input";
    }
    if (block.type === "text") {
      return "text-input";
    } else if (block.type === "math_number") {
      return "math-calculation-input";
    } else if (block.type === "math_integer") {
      // considerable..
      return "id-input";
    } else if (block.type === "math_whole_number") {
      return "id-input";
    } else if (block.type === "math_positive_number") {
      return "math-calculation-input";
    } else if (block.type === "math_angle") {
      return "math-calculation-input";
    }
    return "other-input";
  }

  const setColor = (block, type) => {
    if(type === "always" || type === "off-hover") {
      // Add CSS class to dim the block - CSS will handle the styling
      block.svgGroup_.classList.add("sa-dim-empty-text-input");
    } else if(type === "warning") {
      // Add CSS class for warning style
      block.svgGroup_.classList.add("sa-dim-empty-text-input-warning");
    } else {
      // Remove all dim classes
      block.svgGroup_.classList.remove("sa-dim-empty-text-input");
      block.svgGroup_.classList.remove("sa-dim-empty-text-input-warning");
    }
  };
  
  const isEmpty = (block) => {
    if (
      !block || !block.inputList
      || !block.inputList[0] || !block.inputList[0].fieldRow
      || !block.inputList[0].fieldRow[0] || !block.inputList[0].fieldRow[0].getArgTypes()
      || block.inputList[0].fieldRow[0].getArgTypes().includes("dropdown")
    ) {
      return false;
    }
    const text = block.inputList[0].fieldRow[0].text_;
    if (addon.settings.get("trim")) {
      text = text.trim();
    }
    return !text || text === "";
  }

  const originalRender = ScratchBlocks.BlockSvg.prototype.render;
  ScratchBlocks.BlockSvg.prototype.render = function (opt_bubble) {
    if (this.isShadow() && this.getParent() && !this.getParent().isShadow()) {
      const type = getType(this);
      if (isEmpty(this)) {
        setColor(this, addon.settings.get(type));
      } else {
        setColor(this, "never");
      }
    }
    return originalRender.call(this, opt_bubble);
  };

  if (vm.editingTarget) {
    vm.emitWorkspaceUpdate();
  }

  // Handle hover events
  let hoveredElement = null;
  let hoveredAttribute = null;
  let doNotModifyUntilMoveMouse = false;

  const offHover = () => {
    if (hoveredElement && hoveredAttribute) {
      setColor(getBlock(hoveredElement.dataset.id), hoveredAttribute);
      hoveredElement = null;
      hoveredAttribute = null;
    }
  };

  // const getBlock = (id) => vm.editingTarget.blocks.getBlock(id) || vm.runtime.flyoutBlocks.getBlock(id);
  const getBlock = (id) => ScratchBlocks.getMainWorkspace().getBlockById(id) || ScratchBlocks.getMainWorkspace().getFlyout().getWorkspace().getBlockById(id);

  document.addEventListener("mouseover", (e) => {
    if (addon.self.disabled) {
      return;
    }
    if (doNotModifyUntilMoveMouse) {
      return;
    }

    const ea = e.target.closest(".blocklyBubbleCanvas > g, [data-argument-type]");
    if (ea === hoveredAttribute) {
      // Nothing to do.
      return;
    }
    if (!ea) {
      offHover();
      return;
    }

    let dim = null;
    const argBlock = getBlock(ea.dataset.id);
    if(!argBlock) {
      // maybe dropdowns or others
      offHover();
      return;
    }
    const el = e.target.closest(".blocklyBlockCanvas .blocklyDraggable[data-id]");
    if (el && getBlock(el.dataset.id)) {
      if (isEmpty(argBlock)) {
        const type = getType(argBlock);
        const config = addon.settings.get(type);
        if (config === "on-hover") {
          dim = true;
        } else if (config === "off-hover") {
          dim = false;
        }
      }
    }

    offHover();
    if(dim === null) return;

    setColor(argBlock, dim ? "always" : "never");
    hoveredElement = ea;
    hoveredAttribute = !dim ? "always" : "never";
  });

  document.addEventListener("mousemove", (e) => {
    doNotModifyUntilMoveMouse = false;
  });

  document.addEventListener(
    "mousedown",
    () => {
      offHover();
      doNotModifyUntilMoveMouse = true;
    },
    {
      capture: true,
    }
  );
}