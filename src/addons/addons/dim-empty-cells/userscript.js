export default async function ({addon, console, msg}) {
    const dimEmptyCells = () => {
        const cells = document.querySelectorAll(".sb3-blockly-workspace .sb3-blockly-block");
        cells.forEach(cell => {
            if (cell.querySelector(".sb3-blockly-block-shape")) {
                cell.classList.remove("sb3-dim-empty-cell");
            } else {
                cell.classList.add("sb3-dim-empty-cell");
            }
        });
    };
}