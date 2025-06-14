let db;
let SQL;

initSqlJs({
  locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${file}`
}).then(SQLLib => {
  SQL = SQLLib;
  localforage.getItem("userDB").then(buffer => {
    if (buffer) {
      db = new SQL.Database(new Uint8Array(buffer));
      loadPaymentHistory();
    } else {
      alert("⚠️ Không tìm thấy dữ liệu.");
    }
  });
});

function loadPaymentHistory(query = null) {
  const table = document.querySelector("#paymentTable tbody");
  table.innerHTML = "";

  let sql = `
    SELECT Thuhocphi_id, strftime('%d/%m/%Y', Thuhocphi_date) AS date, student_name, class_name, Thuhocphi_money
    FROM Thuhocphi
    ORDER BY Thuhocphi_date DESC
  `;
  let rows = db.exec(query || sql)[0]?.values || [];

  rows.forEach(([id, date, name, classname, money], index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${date}</td>
      <td>${name}</td>
      <td>${classname}</td>
      <td>${Number(money).toLocaleString()} đ</td>
      <td>
        <button onclick="deletePayment(${id})"
            style="
            background: none;
            border: none;
            padding: 0;
            cursor: pointer;
            font-size: 18px;
            "
            title="Xoá">
            🗑️
        </button>
    </td>

    `;
    table.appendChild(tr);
  });
}

function searchByName() {
  const name = document.getElementById("search-name").value.trim();
  if (!name) return;

  const sql = `
    SELECT Thuhocphi_id, strftime('%d/%m/%Y', Thuhocphi_date), student_name, class_name, Thuhocphi_money
    FROM Thuhocphi
    WHERE student_name LIKE '%${name}%'
    ORDER BY Thuhocphi_date DESC
  `;
  loadPaymentHistory(sql);
}

function searchByDate() {
  const start = document.getElementById("start-date").value;
  const end = document.getElementById("end-date").value;

  if (!start || !end) {
    alert("Vui lòng chọn đủ ngày bắt đầu và kết thúc.");
    return;
  }

  const sql = `
    SELECT Thuhocphi_id, strftime('%d/%m/%Y', Thuhocphi_date), student_name, class_name, Thuhocphi_money
    FROM Thuhocphi
    WHERE date(Thuhocphi_date) BETWEEN '${start}' AND '${end}'
    ORDER BY Thuhocphi_date DESC
  `;
  loadPaymentHistory(sql);
}

function deletePayment(id) {
  if (!confirm("Bạn có chắc chắn muốn xoá bản ghi này?")) return;

  // Lấy student_id để cập nhật lại noptien
  const result = db.exec(`SELECT student_id FROM Thuhocphi WHERE Thuhocphi_id = ${id}`);
  const studentId = result[0]?.values[0]?.[0];
  if (studentId) {
    db.run(`UPDATE Students SET noptien = 0 WHERE student_id = ?`, [studentId]);
  }

  db.run(`DELETE FROM Thuhocphi WHERE Thuhocphi_id = ?`, [id]);
  localforage.setItem("userDB", db.export());
  loadPaymentHistory();
}
