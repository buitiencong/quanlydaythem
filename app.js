let db;

initSqlJs({
  locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${file}`
}).then(SQL => {
  document.getElementById("dbfile").addEventListener("change", event => {
    const reader = new FileReader();
    reader.onload = function () {
      try {
        db = new SQL.Database(new Uint8Array(reader.result));
        loadTabsAndStudents();
      } catch (err) {
        alert("Lỗi khi đọc file database: " + err.message);
      }
    };
    reader.readAsArrayBuffer(event.target.files[0]);
  });
});

function loadTabsAndStudents() {
  const tabs = document.getElementById("tabs");
  const contents = document.getElementById("tabContents");
  tabs.innerHTML = "";
  contents.innerHTML = "";

  let classes;
  try {
    classes = db.exec("SELECT class_id, class_name FROM Classes");
  } catch (err) {
    alert("Không tìm thấy bảng Classes hoặc cột class_id/class_name.\nChi tiết: " + err.message);
    return;
  }

  if (!classes || classes.length === 0) {
    tabs.innerHTML = "<p>Không có lớp học nào.</p>";
    return;
  }

  classes[0].values.forEach(([classId, className], index) => {
    // Tạo tab
    const tabBtn = document.createElement("div");
    tabBtn.className = "tab-button" + (index === 0 ? " active" : "");
    tabBtn.textContent = className;
    tabBtn.dataset.classId = classId;
    tabBtn.onclick = () => switchTab(classId);
    tabs.appendChild(tabBtn);

    // Tạo nội dung tab
    const contentDiv = document.createElement("div");
    contentDiv.className = "tab-content" + (index === 0 ? " active" : "");
    contentDiv.id = `tab-${classId}`;

    // Lấy học sinh trong lớp
    let studentResult;
    try {
      studentResult = db.exec(`SELECT student_name FROM Students WHERE class_id = ${classId}`);
    } catch (err) {
      contentDiv.innerHTML = "<p>Lỗi truy vấn học sinh: " + err.message + "</p>";
      contents.appendChild(contentDiv);
      return;
    }

    if (studentResult.length > 0 && studentResult[0].values.length > 0) {
      const ul = document.createElement("ul");
      studentResult[0].values.forEach(([name]) => {
        const li = document.createElement("li");
        li.textContent = name;
        ul.appendChild(li);
      });
      contentDiv.appendChild(ul);
    } else {
      contentDiv.innerHTML = "<i>Không có học sinh nào trong lớp này.</i>";
    }

    contents.appendChild(contentDiv);
  });
}

function switchTab(classId) {
  document.querySelectorAll(".tab-button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.classId == classId);
  });
  document.querySelectorAll(".tab-content").forEach(div => {
    div.classList.toggle("active", div.id === `tab-${classId}`);
  });
}
