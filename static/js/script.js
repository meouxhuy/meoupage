document.addEventListener('DOMContentLoaded', async () => {
  const loginCard = document.getElementById('loginCard');
  const dashboardCard = document.getElementById('dashboardCard');
  const loginForm = document.getElementById('loginForm');
  const errorMsg = document.getElementById('errorMsg');
  const copyBtn = document.getElementById('copyBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  let usersData = {};
  let usersIndex = {};
  let usersDisplayName = {};

  // 1. Fetch và parse file env.txt và username.txt
  try {
    const [envResponse, userResponse] = await Promise.all([
      fetch('env.txt'),
      fetch('username.txt').catch(() => null)
    ]);
    
    if (!envResponse.ok) {
      throw new Error("Không thể tải file env.txt (Hãy chắc chắn bạn đang chạy qua Local Server như Live Server)");
    }
    const envText = await envResponse.text();
    
    if (userResponse && userResponse.ok) {
      const userText = await userResponse.text();
      let tempUser = {};
      userText.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const splitIdx = line.indexOf('=');
          if (splitIdx > 0) {
            const key = line.substring(0, splitIdx).trim();
            let value = line.substring(splitIdx + 1).trim();
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.substring(1, value.length - 1);
            }
            tempUser[key] = value;
          }
        }
      });
      for (const [key, value] of Object.entries(tempUser)) {
        if (key.startsWith('USER_EMAIL_')) {
          const indexStr = key.replace('USER_EMAIL_', '');
          const displayNameKey = `DISPLAY_NAME_${indexStr}`;
          if (tempUser[displayNameKey]) {
            usersDisplayName[value] = tempUser[displayNameKey];
          }
        }
      }
    }
    
    // Parse .env
    const lines = envText.split('\n');
    let tempEnv = {};
    
    lines.forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const splitIdx = line.indexOf('=');
        if (splitIdx > 0) {
          const key = line.substring(0, splitIdx).trim();
          let value = line.substring(splitIdx + 1).trim();
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
          }
          tempEnv[key] = value;
        }
      }
    });

    // Build user dict from env
    for (const [key, value] of Object.entries(tempEnv)) {
      if (key.startsWith('USER_EMAIL_')) {
        const indexStr = key.replace('USER_EMAIL_', '');
        const index = parseInt(indexStr);
        const passKey = `USER_PASS_${index}`;
        
        if (tempEnv[passKey]) {
          usersData[value] = tempEnv[passKey];
          usersIndex[value] = index;
        }
      }
    }
    
  } catch (err) {
    console.error(err);
    showError("Lỗi đọc dữ liệu: " + err.message);
  }

  // 2. Kiểm tra trạng thái đăng nhập
  const loggedInEmail = localStorage.getItem('meou_user_email');
  if (loggedInEmail && usersData[loggedInEmail]) {
    showDashboard(loggedInEmail);
  }

  // 3. Xử lý Đăng Nhập
  const loadingOverlay = document.getElementById('loadingOverlay');

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('emailInput').value.trim();
    const pass = document.getElementById('passwordInput').value.trim();
    
    errorMsg.style.display = 'none';

    if (usersData[email] && pass === 'dunglamdungtool') {
      localStorage.setItem('meou_user_email', email);
      localStorage.setItem('meou_login_time', getFormattedTime());
      
      // Fade out login card
      loginCard.style.opacity = '0';
      loginCard.style.transform = 'translateY(-20px) scale(0.95)';
      loginCard.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      
      setTimeout(() => {
        loginCard.style.display = 'none';
        // Show loading overlay
        loadingOverlay.style.display = 'flex';
        
        // After 5s, hide loading and show dashboard
        setTimeout(() => {
          loadingOverlay.style.display = 'none';
          showDashboard(email);
        }, 5000);
      }, 400);
    } else {
      showError("Email hoặc mật khẩu không đúng!");
    }
  });

  // 4. Xử lý Đăng Xuất
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('meou_user_email');
    localStorage.removeItem('meou_login_time');
    document.getElementById('emailInput').value = '';
    document.getElementById('passwordInput').value = '';
    
    // Smooth transition
    dashboardCard.style.opacity = '0';
    dashboardCard.style.transform = 'translateY(-20px) scale(0.95)';
    dashboardCard.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    
    setTimeout(() => {
      dashboardCard.style.display = 'none';
      loginCard.style.display = 'block';
      // Reset animation
      loginCard.style.opacity = '0';
      loginCard.style.transform = 'translateY(20px)';
      requestAnimationFrame(() => {
        loginCard.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        loginCard.style.opacity = '1';
        loginCard.style.transform = 'translateY(0)';
      });
    }, 350);
  });

  function getFormattedTime() {
    const d = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear().toString().slice(2)}`;
  }

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
  }

  function showDashboard(email) {
    loginCard.style.display = 'none';
    dashboardCard.style.display = 'block';
    
    // Trigger entrance animation
    dashboardCard.style.opacity = '0';
    dashboardCard.style.transform = 'translateY(20px)';
    requestAnimationFrame(() => {
      dashboardCard.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
      dashboardCard.style.opacity = '1';
      dashboardCard.style.transform = 'translateY(0)';
    });
    
    const index = usersIndex[email];
    let serverName = "";
    let serverUrl = "";
    
    // Logic chia server
    if (index === 1 || index === 21) {
      serverName = "Server Admin";
      serverUrl = "https://meou-scan-admin.onrender.com/";
    } else if (index >= 2 && index <= 20) {
      const serverNum = index - 1;
      serverName = `Server ${serverNum}`;
      serverUrl = `https://meou-scan-sv${serverNum}.onrender.com/`;
    } else {
      serverName = "Server Khách";
      serverUrl = "https://meou-scan-public.onrender.com/";
    }

    // Hiển thị UI
    let username = usersDisplayName[email];
    if (!username) {
      username = email.split('@')[0];
      if (username.endsWith('.sc')) {
        username = username.slice(0, -3);
      }
    }
    
    document.getElementById('userNameDisplay').textContent = username;
    document.getElementById('userNameDisplay').className = "username-gradient";
    document.getElementById('serverNameDisplay').textContent = serverName;
    
    const linkEl = document.getElementById('serverLinkDisplay');
    linkEl.textContent = serverUrl;
    linkEl.href = serverUrl;

    // Hiển thị thông tin đăng nhập Server
    document.getElementById('serverAccEmail').textContent = email;
    const realPass = usersData[email];
    document.getElementById('serverAccPass').textContent = realPass;

    // Hàm tiện ích copy
    function setupCopy(btnId, textToCopy) {
      const btn = document.getElementById(btnId);
      btn.onclick = () => {
        navigator.clipboard.writeText(textToCopy).then(() => {
          btn.style.color = "#7bc88f";
          btn.style.transform = "scale(1.2)";
          setTimeout(() => { 
            btn.style.color = ""; 
            btn.style.transform = "";
          }, 1500);
        });
      };
    }

    setupCopy('copyAccBtn', email);
    setupCopy('copyPassBtn', realPass);

    // Xử lý nút Copy Link Server
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(serverUrl).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = "✓ Đã Sao Chép!";
        copyBtn.style.background = "rgba(123, 200, 143, 0.3)";
        copyBtn.style.borderColor = "rgba(123, 200, 143, 0.5)";
        copyBtn.style.color = "#4a9960";
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.style.background = "";
          copyBtn.style.borderColor = "";
          copyBtn.style.color = "";
        }, 2000);
      }).catch(err => {
        showError("Không thể copy: " + err);
      });
    };

    // Lấy IP và hiển thị thông tin Meta
    const metaInfo = document.getElementById('loginMetaInfo');
    const loginTime = localStorage.getItem('meou_login_time') || getFormattedTime();
    
    // Tạo device key ảo nhưng lưu cứng vào trình duyệt để hù người dùng
    let deviceKey = localStorage.getItem('meou_device_key');
    if (!deviceKey) {
      const gen = () => Math.random().toString(36).substring(2, 6).toUpperCase();
      deviceKey = `${gen()}-${gen()}-${gen()}-${gen()}`;
      localStorage.setItem('meou_device_key', deviceKey);
    }
    
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => {
        metaInfo.innerHTML = `IP: ${data.ip} · Time: ${loginTime}<br><span class="key-text">Key: ${deviceKey}</span>`;
      })
      .catch(err => {
        metaInfo.innerHTML = `IP: Không xác định · Time: ${loginTime}<br><span class="key-text">Key: ${deviceKey}</span>`;
      });
  }
});

