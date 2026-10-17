const search = document.getElementById("search");
const unit = document.getElementById("unit");
const statusFilter = document.getElementById("statusFilter");
const rows = [...document.querySelectorAll("#memberRows tr")];
const emptyMessage = document.getElementById("emptyMessage");
const statCards = [...document.querySelectorAll(".stats .stat-card")];

function updateStatistics() {
  const total = rows.length;
  const present = rows.filter(row => row.dataset.status === "Hadir").length;
  const notCheckedIn = rows.filter(row => row.dataset.status === "Belum Absen").length;
  const units = new Set(rows.map(row => row.dataset.unit).filter(Boolean)).size;
  const attendanceRate = total ? (present / total) * 100 : 0;

  statCards[0].querySelector(".stat-number").textContent = total;
  statCards[1].querySelector(".stat-number").textContent = present;
  statCards[1].querySelector("small").textContent =
    `${attendanceRate.toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dari total anggota`;
  statCards[2].querySelector(".stat-number").textContent = notCheckedIn;
  statCards[3].querySelector(".stat-number").textContent = units;
}

function filterMembers() {
  const query = search.value.toLowerCase().trim();
  let visible = 0;

  rows.forEach(row => {
    const matchesName = row.dataset.name.toLowerCase().includes(query);
    const matchesUnit = !unit.value || row.dataset.unit === unit.value;
    const matchesStatus = !statusFilter.value || row.dataset.status === statusFilter.value;
    const show = matchesName && matchesUnit && matchesStatus;
    row.hidden = !show;
    if (show) visible++;
  });

  emptyMessage.hidden = visible !== 0;
}

updateStatistics();
search.addEventListener("input", filterMembers);
unit.addEventListener("change", filterMembers);
statusFilter.addEventListener("change", filterMembers);
