import { FILE_SYSTEM } from "../data/icons_fs.js";

export function calculateTotalDeletable() {
    let count = 0;
    function traverse(id) {
        if (id === 'cleanup' || id === 'sys_info' || id === 'trash' || id === 'root') return;
        count++;
        if (FILE_SYSTEM[id] && FILE_SYSTEM[id].children) {
            FILE_SYSTEM[id].children.forEach(traverse);
        }
    }
    if (FILE_SYSTEM["root"]) {
        FILE_SYSTEM["root"].children.forEach(traverse);
    }
    return count;
}

export function isFolderEmptyOrDeleted(id, state) {
    if (!FILE_SYSTEM[id] || !FILE_SYSTEM[id].children) return true;
    for (let childId of FILE_SYSTEM[id].children) {
        if (childId === 'cleanup' || childId === 'sys_info') return false;

        if (!state.trashFiles.includes(childId) && !state.permanentlyDeletedIds.includes(childId)) {
            return false;
        }

        if (FILE_SYSTEM[childId].type === 'folder' || FILE_SYSTEM[childId].type === 'locked') {
            if (!isFolderEmptyOrDeleted(childId, state)) return false;
        }
    }
    return true;
}
