const search = document.getElementById("search");
const unitFilter = document.getElementById("unit");
const statusFilter = document.getElementById("statusFilter");
const memberRows = document.getElementById("memberRows");
const emptyMessage = document.getElementById("emptyMessage");
const statCards = [...document.querySelectorAll(".stats .stat-card")];
const memberForm = document.getElementById("memberForm");
const nameInput = document.getElementById("memberName");
const unitInput = document.getElementById("memberUnit");
const roleInput = document.getElementById("memberRole");
const statusInput = document.getElementById("memberStatus");
const formTitle = document.getElementById("formTitle");
const saveButton = document.getElementById("saveMember");
const cancelEditButton = document.getElementById("cancelEdit");
const exportCsvButton = document.getElementById("exportCsv");
const storageKey = "redhub-latihan-members-v1";

const initialMembers = [...memberRows.querySelectorAll("tr")].map((row, index) => ({
  id: `seed-${index + 1}`,
  name: row.dataset.name,
  unit: row.dataset.unit,
  role: row.cells[2].textContent.trim(),
  status: row.dataset.status
}));

function readMembers() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === null) return initialMembers;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new Error("Invalid saved data");
    return parsed;
  } catch (error) {
    return initialMembers;
  }
}

let members = readMembers();
let editingId = null;

function saveMembers() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(members));
    return true;
  } catch (error) {
    alert("Browser tidak dapat menyimpan data. Periksa pengaturan penyimpanan browser.");
    return false;
  }
}

function updateStatistics() {
  const total = members.length;
  const present = members.filter(member => member.status === "Hadir").length;
  const notCheckedIn = members.filter(member => member.status === "Belum Absen").length;
  const units = new Set(members.map(member => member.unit).filter(Boolean)).size;
  const attendanceRate = total ? (present / total) * 100 : 0;

  statCards[0].querySelector(".stat-number").textContent = total;
  statCards[1].querySelector(".stat-number").textContent = present;
  statCards[1].querySelector("small").textContent =
    `${attendanceRate.toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dari total anggota`;
  statCards[2].querySelector(".stat-number").textContent = notCheckedIn;
  statCards[3].querySelector(".stat-number").textContent = units;
}

function makeCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function renderMembers() {
  const query = search.value.toLowerCase().trim();
  const selectedUnit = unitFilter.value;
  const selectedStatus = statusFilter.value;
  memberRows.replaceChildren();
  let visible = 0;

  members.forEach(member => {
    const matchesName = member.name.toLowerCase().includes(query);
    const matchesUnit = !selectedUnit || member.unit === selectedUnit;
    const matchesStatus = !selectedStatus || member.status === selectedStatus;
    if (!matchesName || !matchesUnit || !matchesStatus) return;

    visible++;
    const row = document.createElement("tr");
    row.dataset.name = member.name;
    row.dataset.unit = member.unit;
    row.dataset.status = member.status;

    const nameCell = document.createElement("td");
    const name = document.createElement("strong");
    name.textContent = member.name;
    nameCell.append(name);
    row.append(nameCell);
    row.append(makeCell(member.unit === "BADAN" ? "Badan" : member.unit === "SAYAP" ? "Sayap" : member.unit));
    row.append(makeCell(member.role));

    const statusCell = document.createElement("td");
    const statusBadge = document.createElement("span");
    statusBadge.className = `status ${member.status === "Hadir" ? "present" : "absent"}`;
    statusBadge.textContent = member.status;
    statusCell.append(statusBadge);
    row.append(statusCell);

    const actionsCell = document.createElement("td");
    actionsCell.className = "row-actions";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "button-small button-edit";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => startEditing(member.id));
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "button-small button-delete";
    deleteButton.textContent = "Hapus";
    deleteButton.addEventListener("click", () => deleteMember(member.id));
    actionsCell.append(editButton, deleteButton);
    row.append(actionsCell);
    memberRows.append(row);
  });

  emptyMessage.hidden = visible !== 0;
  updateStatistics();
}

function resetForm() {
  editingId = null;
  memberForm.reset();
  formTitle.textContent = "Tambah Anggota";
  saveButton.textContent = "Tambah Anggota";
  cancelEditButton.hidden = true;
}

function startEditing(id) {
  const member = members.find(item => item.id === id);
  if (!member) return;
  editingId = id;
  nameInput.value = member.name;
  unitInput.value = member.unit;
  roleInput.value = member.role;
  statusInput.value = member.status;
  formTitle.textContent = "Edit Anggota";
  saveButton.textContent = "Simpan Perubahan";
  cancelEditButton.hidden = false;
  memberForm.scrollIntoView({ behavior: "smooth", block: "start" });
  nameInput.focus();
}

function deleteMember(id) {
  const member = members.find(item => item.id === id);
  if (!member || !confirm(`Hapus anggota "${member.name}"?`)) return;
  members = members.filter(item => item.id !== id);
  saveMembers();
  if (editingId === id) resetForm();
  renderMembers();
}

memberForm.addEventListener("submit", event => {
  event.preventDefault();
  const name = nameInput.value.trim();
  const role = roleInput.value.trim();
  if (!name || !role) return;

  if (editingId) {
    members = members.map(member => member.id === editingId
      ? { ...member, name, unit: unitInput.value, role, status: statusInput.value }
      : member);
  } else {
    members.push({
      id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      unit: unitInput.value,
      role,
      status: statusInput.value
    });
  }

  saveMembers();
  resetForm();
  renderMembers();
});

cancelEditButton.addEventListener("click", resetForm);
search.addEventListener("input", renderMembers);
unitFilter.addEventListener("change", renderMembers);
statusFilter.addEventListener("change", renderMembers);

renderMembers();


function exportMembersCsv() {
  const headers = ["Nama Anggota", "Unit", "Jabatan", "Status"];
  const rows = members.map(member => [
    member.name,
    member.unit === "BADAN" ? "Badan" : member.unit === "SAYAP" ? "Sayap" : member.unit,
    member.role,
    member.status
  ]);
  const escapeCsv = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers, ...rows]
    .map(row => row.map(escapeCsv).join(";"))
    .join("\r\n");
  const blob = new Blob(["\\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "redhub-data-anggota.csv";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

exportCsvButton.addEventListener("click", exportMembersCsv);
