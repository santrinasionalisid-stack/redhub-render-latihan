
const search = document.getElementById("search");
const unit = document.getElementById("unit");
const statusFilter = document.getElementById("statusFilter");

const rows = [...document.querySelectorAll("#memberRows tr")];
const emptyMessage = document.getElementById("emptyMessage");

function updateStatistics() {
  const total = rows.length;
  const present = rows.filter(
    row => row.dataset.status === "Hadir"
  ).length;
  const absent = rows.filter(
    row => row.dataset.status === "Belum Absen"
  ).length;

  // Nama unit distandarkan agar Badan/BADAN dihitung sebagai satu unit.
  const units = new Set(rows.map(
    row => row.dataset.unit.toUpperCase()
  ));

  const rate = total ? Math.round((present / total) * 100) : 0;

  document.getElementById("totalMembers").textContent = total;
  document.getElementById("totalPresent").textContent = present;
  document.getElementById("totalAbsent").textContent = absent;
  document.getElementById("totalUnits").textContent = units.size;
  document.getElementById("attendanceRate").textContent =
    `${rate}% dari anggota`;
}

function filterMembers() {
  const query = search.value.toLowerCase().trim();
  let visible = 0;

  rows.forEach(row => {
    const matchesName =
      row.dataset.name.toLowerCase().includes(query);

    const matchesUnit =
      !unit.value || row.dataset.unit === unit.value;

    const matchesStatus =
      !statusFilter.value ||
      row.dataset.status === statusFilter.value;

    const show = matchesName && matchesUnit && matchesStatus;
    row.hidden = !show;

    if (show) visible++;
  });

  emptyMessage.hidden = visible !== 0;
}

search.addEventListener("input", filterMembers);
unit.addEventListener("change", filterMembers);
statusFilter.addEventListener("change", filterMembers);

updateStatistics();
filterMembers();
