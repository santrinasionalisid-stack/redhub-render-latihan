
const search = document.getElementById("search");
const unit = document.getElementById("unit");
const statusFilter = document.getElementById("statusFilter");
const rows = [...document.querySelectorAll("#memberRows tr")];
const emptyMessage = document.getElementById("emptyMessage");

function filterMembers() {
  const query = search.value.toLowerCase().trim();
  let visible = 0;

  rows.forEach((row) => {
    const matchesName = row.dataset.name.toLowerCase().includes(query);
    const matchesUnit = !unit.value || row.dataset.unit === unit.value;
    const matchesStatus =
      !statusFilter.value || row.dataset.status === statusFilter.value;

    const show = matchesName && matchesUnit && matchesStatus;
    row.hidden = !show;

    if (show) visible++;
  });

  emptyMessage.hidden = visible !== 0;
}

search.addEventListener("input", filterMembers);
unit.addEventListener("change", filterMembers);
statusFilter.addEventListener("change", filterMembers);
