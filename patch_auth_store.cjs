const fs = require('fs');

// 1. Update Login.jsx
let loginCode = fs.readFileSync('/media/syzhaa/DATA/Project/yatama/absen/src/pages/Login.jsx', 'utf8');
if (!loginCode.includes('setUserId')) {
  loginCode = loginCode.replace(
    /const setUserRole = useAppStore\(\(state\) => state\.setUserRole\);/,
    `const setUserRole = useAppStore((state) => state.setUserRole);
  const setUserId = useAppStore((state) => state.setUserId);
  const setUserName = useAppStore((state) => state.setUserName);
  const setUserEmail = useAppStore((state) => state.setUserEmail);`
  );

  loginCode = loginCode.replace(
    /if \(role\) setUserRole\(role\);/,
    `if (role) setUserRole(role);
        const userData = response.data?.user || response.data?.data?.user;
        if (userData?.id) setUserId(userData.id);
        if (userData?.name) setUserName(userData.name);
        if (userData?.email) setUserEmail(userData.email);`
  );
  fs.writeFileSync('/media/syzhaa/DATA/Project/yatama/absen/src/pages/Login.jsx', loginCode);
  console.log('Patched Login.jsx');
}

// 2. Update App.jsx
let appCode = fs.readFileSync('/media/syzhaa/DATA/Project/yatama/absen/src/App.jsx', 'utf8');
if (!appCode.includes('setUserId')) {
  appCode = appCode.replace(
    /const setUserRole = useAppStore\(\(state\) => state\.setUserRole\);/,
    `const setUserRole = useAppStore((state) => state.setUserRole);
  const setUserId = useAppStore((state) => state.setUserId);
  const setUserName = useAppStore((state) => state.setUserName);
  const setUserEmail = useAppStore((state) => state.setUserEmail);`
  );

  appCode = appCode.replace(
    /setUserLembaga\(data\.data\.lembaga\);/,
    `setUserLembaga(data.data.lembaga);
          setUserId(data.data.id);
          setUserName(data.data.name);
          setUserEmail(data.data.email);`
  );
  fs.writeFileSync('/media/syzhaa/DATA/Project/yatama/absen/src/App.jsx', appCode);
  console.log('Patched App.jsx');
}
