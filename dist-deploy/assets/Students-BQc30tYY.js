import{r as e,s as t}from"./api-CtBGzE02.js";import{a as n,i as r,n as i,t as a,w as o}from"./useAppStore-CxuUjUs9.js";import{d as s,i as c,l,p as u,r as d}from"./index-CO_dd7kD.js";import{n as f,r as p,t as m}from"./FileSaver.min-D1p1DMZi.js";var h=t(o(),1),g=n();function _({isOpen:t,onClose:n,editingStudent:r,formData:i,setFormData:a,onSubmit:o,isPending:s,kelasData:c}){let[l,u]=(0,h.useState)(null),[f,p]=(0,h.useState)(r?.foto||null),m=e=>{let t=e.target.files?.[0];if(t){if(t.size>2097152){alert(`Ukuran foto maksimal 2MB`);return}u(t),p(URL.createObjectURL(t))}},_=()=>{u(null),p(null)},v=`w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all`,y=`${v} placeholder:text-gray-400`,b=`${v} cursor-pointer`,x=`block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5`,S=e=>({value:i[e],onChange:t=>a({...i,[e]:t.target.value})});return(0,g.jsx)(d,{isOpen:t,onClose:n,title:r?`Edit Siswa`:`Tambah Siswa`,size:`lg`,footer:(0,g.jsxs)(`div`,{className:`space-y-2`,children:[(0,g.jsxs)(`button`,{type:`button`,onClick:()=>o(l),className:`w-full py-3.5 px-6 bg-primary-green text-gray-900 font-bold text-base md:text-lg rounded-full border-2 border-gray-900 shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`,disabled:s,children:[(0,g.jsx)(`span`,{className:`material-symbols-outlined text-xl`,children:r?`save`:`check`}),(0,g.jsx)(`span`,{children:s?`Menyimpan...`:r?`Update Siswa`:`Simpan Siswa`})]}),(0,g.jsx)(`button`,{type:`button`,onClick:n,className:`w-full py-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors text-center`,children:`Batal`})]}),children:(0,g.jsxs)(`form`,{onSubmit:e=>{e.preventDefault(),o(l)},id:`student-form`,className:`grid grid-cols-1 md:grid-cols-2 gap-4`,children:[(0,g.jsxs)(`div`,{className:`md:col-span-2`,children:[(0,g.jsx)(`label`,{className:x,children:`Foto Siswa`}),(0,g.jsxs)(`div`,{className:`flex items-start gap-4`,children:[f&&(0,g.jsxs)(`div`,{className:`relative`,children:[(0,g.jsx)(`img`,{src:e(f),alt:`Preview`,className:`w-24 h-24 object-cover rounded-lg border-2 border-gray-300`}),(0,g.jsx)(`button`,{type:`button`,onClick:_,className:`absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600`,children:(0,g.jsx)(`span`,{className:`material-symbols-outlined text-sm`,children:`close`})})]}),(0,g.jsxs)(`div`,{className:`flex-1`,children:[(0,g.jsx)(`input`,{type:`file`,accept:`image/jpeg,image/png,image/jpg`,onChange:m,className:`hidden`,id:`photo-upload`}),(0,g.jsxs)(`label`,{htmlFor:`photo-upload`,className:`inline-flex items-center gap-2 px-4 py-2 bg-gray-100 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors`,children:[(0,g.jsx)(`span`,{className:`material-symbols-outlined`,children:`upload`}),(0,g.jsx)(`span`,{className:`text-sm font-medium`,children:f?`Ganti Foto`:`Pilih Foto`})]}),(0,g.jsx)(`p`,{className:`text-xs text-gray-500 mt-1`,children:`JPG, PNG. Max 2MB`})]})]})]}),(0,g.jsxs)(`div`,{children:[(0,g.jsx)(`label`,{className:x,children:`Lembaga *`}),(0,g.jsxs)(`select`,{...S(`lembaga`),className:b,required:!0,children:[(0,g.jsx)(`option`,{value:`MA`,children:`MA`}),(0,g.jsx)(`option`,{value:`MTs`,children:`MTs`})]})]}),(0,g.jsxs)(`div`,{children:[(0,g.jsx)(`label`,{className:x,children:`Nama Siswa *`}),(0,g.jsx)(`input`,{type:`text`,...S(`nama`),className:y,placeholder:`Nama lengkap siswa`,required:!0})]}),(0,g.jsxs)(`div`,{children:[(0,g.jsx)(`label`,{className:x,children:`NISN (10 digit)`}),(0,g.jsx)(`input`,{type:`text`,value:i.nisn,onChange:e=>{let t=e.target.value.replace(/\D/g,``);t.length<=10&&a({...i,nisn:t})},className:y,placeholder:`10 digit angka`,maxLength:10}),i.nisn&&i.nisn.length>0&&i.nisn.length!==10&&(0,g.jsxs)(`p`,{className:`text-red-600 text-xs font-semibold mt-1`,children:[`NISN harus tepat 10 digit (sekarang: `,i.nisn.length,`)`]})]}),(0,g.jsxs)(`div`,{children:[(0,g.jsx)(`label`,{className:x,children:`Tempat Lahir`}),(0,g.jsx)(`input`,{type:`text`,...S(`tempat_lahir`),className:y,placeholder:`Kota tempat lahir`})]}),(0,g.jsxs)(`div`,{children:[(0,g.jsx)(`label`,{className:x,children:`Tanggal Lahir`}),(0,g.jsx)(`input`,{type:`date`,...S(`tanggal_lahir`),className:v})]}),(0,g.jsxs)(`div`,{children:[(0,g.jsx)(`label`,{className:x,children:`Jenis Kelamin *`}),(0,g.jsxs)(`select`,{...S(`jenis_kelamin`),className:b,required:!0,children:[(0,g.jsx)(`option`,{value:`L`,children:`Laki-laki`}),(0,g.jsx)(`option`,{value:`P`,children:`Perempuan`})]})]}),(0,g.jsxs)(`div`,{children:[(0,g.jsx)(`label`,{className:x,children:`Kelas`}),(0,g.jsxs)(`select`,{...S(`kelas`),className:b,children:[(0,g.jsx)(`option`,{value:``,children:`-- Pilih Kelas --`}),c?.data?.map(e=>(0,g.jsx)(`option`,{value:e.nama,children:e.nama},e.id))]})]}),(0,g.jsxs)(`div`,{children:[(0,g.jsx)(`label`,{className:x,children:`No HP Orang Tua`}),(0,g.jsx)(`input`,{type:`text`,...S(`nomor_hp_orangtua`),className:y,placeholder:`08123456789`})]}),(0,g.jsxs)(`div`,{children:[(0,g.jsx)(`label`,{className:x,children:`Status`}),(0,g.jsxs)(`select`,{...S(`status`),className:b,children:[(0,g.jsx)(`option`,{value:`aktif`,children:`Aktif`}),(0,g.jsx)(`option`,{value:`nonaktif`,children:`Non-aktif`}),(0,g.jsx)(`option`,{value:`lulus`,children:`Lulus`}),(0,g.jsx)(`option`,{value:`pindah`,children:`Pindah`})]})]}),(0,g.jsxs)(`div`,{className:`md:col-span-2`,children:[(0,g.jsx)(`label`,{className:x,children:`Alamat Lengkap`}),(0,g.jsx)(`textarea`,{...S(`alamat`),className:`w-full px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all placeholder:text-gray-400`,rows:`3`,placeholder:`Alamat domisili siswa`})]})]})})}function v({student:t,isSelected:n,onSelect:r,onDownloadQR:i,onEdit:a,onDelete:o,onShowCard:s,isDeletePending:c,activeDropdown:l,setActiveDropdown:u}){let d=l===t.id,f=()=>u(null),p=`w-full text-left px-4 py-2 text-sm font-bold flex items-center gap-2`;return(0,g.jsx)(`div`,{className:`bg-white border-2 md:border-3 border-gray-900 rounded-xl md:rounded-2xl p-3.5 md:p-4 shadow-neo transition-all ${n?`bg-emerald-50/70 border-primary-green`:``}`,children:(0,g.jsxs)(`div`,{className:`flex items-start justify-between gap-3`,children:[(0,g.jsxs)(`div`,{className:`flex items-start gap-3 min-w-0 flex-1`,children:[(0,g.jsx)(`div`,{className:`flex items-center pt-1`,children:(0,g.jsx)(`input`,{type:`checkbox`,checked:n,onChange:()=>r(t.id),className:`w-4 h-4 md:w-5 md:h-5 rounded border-2 border-gray-900 text-primary-green focus:ring-0 cursor-pointer flex-shrink-0`})}),(0,g.jsx)(`div`,{className:`flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-gray-900 overflow-hidden bg-gray-100 flex items-center justify-center`,children:t.foto?(0,g.jsx)(`img`,{src:e(t.foto),alt:t.nama,className:`w-full h-full object-cover`,onError:e=>{e.target.onerror=null;let n=t.jenis_kelamin===`P`?`ec4899`:`3b82f6`;e.target.src=`https://ui-avatars.com/api/?name=${encodeURIComponent(t.nama)}&background=${n}&color=fff&bold=true`}}):(0,g.jsx)(`img`,{src:`https://ui-avatars.com/api/?name=${encodeURIComponent(t.nama)}&background=${t.jenis_kelamin===`P`?`ec4899`:`3b82f6`}&color=fff&bold=true`,alt:t.nama,className:`w-full h-full object-cover`})}),(0,g.jsxs)(`div`,{className:`space-y-1.5 min-w-0 flex-1`,children:[(0,g.jsx)(`h3`,{className:`font-bold text-base md:text-lg text-gray-900 truncate leading-snug`,children:t.nama}),(0,g.jsxs)(`div`,{className:`flex flex-wrap items-center gap-1.5`,children:[(0,g.jsx)(`span`,{className:`px-2 py-0.5 text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 rounded-md`,children:t.kelas||`Tanpa Kelas`}),(0,g.jsx)(`span`,{className:`px-2 py-0.5 text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300 rounded-md uppercase`,children:t.lembaga}),(0,g.jsx)(`span`,{className:`px-2 py-0.5 text-[11px] font-bold rounded-md border ${t.status===`aktif`?`bg-emerald-100 text-emerald-800 border-emerald-300`:`bg-gray-100 text-gray-700 border-gray-300`}`,children:t.status?.toUpperCase()}),t.nisn&&(0,g.jsxs)(`span`,{className:`text-[11px] font-medium text-gray-500 hidden sm:inline`,children:[`NISN: `,t.nisn]})]})]})]}),(0,g.jsxs)(`div`,{className:`relative flex items-center gap-1.5 flex-shrink-0`,children:[(0,g.jsxs)(`div`,{className:`hidden md:flex items-center gap-1.5`,children:[(0,g.jsx)(`button`,{onClick:()=>s(t),className:`p-1.5 md:p-2 bg-blue-100 text-blue-700 border-2 border-gray-900 rounded-lg hover:bg-blue-200 transition-colors shadow-sm`,title:`Lihat Kartu`,children:(0,g.jsx)(`span`,{className:`material-symbols-outlined text-lg`,children:`badge`})}),(0,g.jsx)(`button`,{onClick:()=>a(t),className:`p-1.5 md:p-2 bg-amber-100 text-amber-900 border-2 border-gray-900 rounded-lg hover:bg-amber-200 transition-colors shadow-sm`,title:`Edit siswa`,children:(0,g.jsx)(`span`,{className:`material-symbols-outlined text-lg`,children:`edit`})}),(0,g.jsx)(`button`,{onClick:()=>o(t.id),disabled:c,className:`p-1.5 md:p-2 bg-red-100 text-red-700 border-2 border-gray-900 rounded-lg hover:bg-red-200 transition-colors shadow-sm disabled:opacity-50`,title:`Hapus siswa`,children:(0,g.jsx)(`span`,{className:`material-symbols-outlined text-lg`,children:`delete`})})]}),(0,g.jsxs)(`div`,{className:`md:hidden relative`,children:[(0,g.jsx)(`button`,{onClick:()=>u(d?null:t.id),className:`p-1.5 bg-gray-100 text-gray-700 border-2 border-gray-900 rounded-lg shadow-sm`,children:(0,g.jsx)(`span`,{className:`material-symbols-outlined text-lg`,children:`more_vert`})}),d&&(0,g.jsxs)(`div`,{className:`absolute right-0 top-full mt-1 w-40 bg-white border-2 border-gray-900 rounded-xl shadow-neo z-10 overflow-hidden`,children:[(0,g.jsxs)(`button`,{onClick:()=>{s&&s(t),f()},className:`${p} hover:bg-gray-100 text-blue-700`,children:[(0,g.jsx)(`span`,{className:`material-symbols-outlined text-lg`,children:`badge`}),`Lihat Kartu`]}),(0,g.jsxs)(`button`,{onClick:()=>{a(t),f()},className:`${p} hover:bg-gray-100 text-amber-700`,children:[(0,g.jsx)(`span`,{className:`material-symbols-outlined text-[18px]`,children:`edit`}),`Edit`]}),(0,g.jsxs)(`button`,{onClick:()=>{o(t.id),f()},disabled:c,className:`${p} text-red-700 hover:bg-red-50 disabled:opacity-50`,children:[(0,g.jsx)(`span`,{className:`material-symbols-outlined text-[18px]`,children:`delete`}),`Hapus`]})]})]})]})]})})}var y=t(p(),1);function b({students:e=[],onClose:t,type:n=`student`}){let r=(0,h.useRef)(null),[i,a]=(0,h.useState)({});(0,h.useEffect)(()=>{e.length>0&&(async()=>{let t={};for(let n of e)if(n?.uuid)try{t[n.id]=await y.toDataURL(n.uuid,{width:300,margin:1,color:{dark:`#000000`,light:`#ffffff`}})}catch(e){console.error(`Failed to generate QR for`,n.id,e)}a(t)})()},[e]);let o=()=>{let t=window.open(``,`_blank`),n=r.current.innerHTML,i=document.getElementById(`id-card-styles`).innerHTML;t.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Kartu - ${e.length} Data</title>
          <style>
            ${i}
          </style>
        </head>
        <body>
          <div class="print-container">
            ${n}
          </div>
        </body>
      </html>
    `),t.document.close(),setTimeout(()=>{t.print(),t.close()},800)},s=e=>e===`MA`?`MADRASAH ALIYAH`:e===`MTs`?`MADRASAH TSANAWIYAH`:e===`Yayasan`?`YAYASAN RAUDHATUL YATAMA`:e,c=e=>{let t=new Date().getFullYear(),n=parseInt(e);return[7,10].includes(n)?t+3:[8,11].includes(n)?t+2:[9,12].includes(n)?t+1:`Selama Menjadi Siswa`},l=e=>e?new Date(e).toLocaleDateString(`id-ID`,{day:`2-digit`,month:`2-digit`,year:`numeric`}):``,u=e=>e?e.startsWith(`http`)?e:`${`https://apima.sylink.my.id/api/v1`.replace(/\/api(\/v1)?$/,``)}${e.startsWith(`/`)?``:`/`}${e}`:null;return(0,g.jsxs)(`div`,{className:`fixed inset-0 bg-black/60 flex flex-col z-50 overflow-hidden`,children:[(0,g.jsxs)(`div`,{className:`bg-white p-4 shadow-md flex justify-between items-center z-10 relative`,children:[(0,g.jsxs)(`div`,{children:[(0,g.jsx)(`h2`,{className:`text-xl font-bold`,children:`Preview Cetak Kartu`}),(0,g.jsxs)(`p`,{className:`text-sm text-gray-500`,children:[e.length,` Kartu siap dicetak`]})]}),(0,g.jsxs)(`div`,{className:`flex gap-3`,children:[(0,g.jsxs)(`button`,{onClick:o,className:`py-2 px-6 bg-primary-green text-gray-900 font-bold rounded-lg shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all flex items-center justify-center gap-2`,children:[(0,g.jsx)(`span`,{className:`material-symbols-outlined`,children:`print`}),(0,g.jsx)(`span`,{children:`Cetak Kartu`})]}),(0,g.jsx)(`button`,{onClick:t,className:`px-4 py-2 font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors`,children:`Tutup`})]})]}),(0,g.jsxs)(`div`,{className:`flex-1 overflow-y-auto p-8 bg-gray-200`,children:[(0,g.jsx)(`style`,{id:`id-card-styles`,children:`
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              background: #f3f4f6;
              padding: 20px;
            }
            .print-container {
              display: flex;
              flex-wrap: wrap;
              gap: 20px;
              justify-content: center;
            }
            .id-card-wrapper {
              display: flex;
              gap: 10px;
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
            .id-card {
              width: 54mm;
              height: 86mm;
              background: white;
              border-radius: 6px;
              overflow: hidden;
              box-shadow: 0 0 5px rgba(0,0,0,0.2);
              border: 1px solid #ddd;
              position: relative;
              display: flex;
              flex-direction: column;
              /* Force background colors to print */
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            /* FRONT SIDE */
            .card-header {
              background: linear-gradient(135deg, #059669 0%, #10b981 100%);
              color: white;
              padding: 6px;
              display: flex;
              align-items: center;
              border-bottom-left-radius: 8px;
              border-bottom-right-radius: 8px;
            }
            .card-header .logo {
              width: 28px;
              height: 28px;
              background: white;
              border-radius: 50%;
              padding: 2px;
              flex-shrink: 0;
            }
            .card-header .logo img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              border-radius: 50%;
            }
            .card-header .title-group {
              flex: 1;
              text-align: center;
              margin-left: -14px; /* offset the logo width to keep text centered */
            }
            .card-header h2 {
              font-size: 8px;
              font-weight: bold;
              margin: 0;
              letter-spacing: 0.5px;
            }
            .card-header h1 {
              font-size: 10px;
              font-weight: bold;
              margin: 0;
              text-transform: uppercase;
            }
            .card-header h3 {
              font-size: 7px;
              font-weight: normal;
              margin-top: 1px;
            }

            .card-body {
              padding: 10px 8px;
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              position: relative;
            }
            .card-body::before {
              content: '';
              position: absolute;
              top: 50%; left: 50%;
              transform: translate(-50%, -50%);
              width: 40mm; height: 40mm;
              background-image: url('/logo.jpg');
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              opacity: 0.06;
              z-index: 1;
            }
            .photo-frame {
              width: 20mm;
              height: 26mm;
              border: 2px solid #059669;
              border-radius: 4px;
              background: #f9fafb;
              z-index: 10;
              overflow: hidden;
              display: flex;
              justify-content: center;
              align-items: center;
              margin-bottom: 6px;
            }
            .photo-frame img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            
            .student-name {
              font-size: 11px;
              font-weight: 900;
              color: #111827;
              margin-top: 2px;
              text-align: center;
              line-height: 1.2;
              width: 100%;
              z-index: 10;
            }
            .student-role {
              font-size: 8.5px;
              color: #059669;
              font-weight: 900;
              margin-bottom: 8px;
              text-transform: uppercase;
              z-index: 10;
            }

            .info-grid {
              width: 100%;
              display: grid;
              grid-template-columns: 22px 4px 1fr;
              gap: 3px 0;
              font-size: 7.5px;
              line-height: 1.3;
              margin-top: auto;
              margin-bottom: 8px;
              z-index: 10;
            }
            .info-label {
              font-weight: bold;
              color: #374151;
            }
            .info-colon {
              text-align: center;
            }
            .info-value {
              color: #111827;
              font-weight: 500;
            }
            .card-footer-front {
              background: #059669;
              color: white;
              text-align: center;
              font-size: 8px;
              padding: 4px;
              width: 100%;
              font-weight: bold;
              z-index: 10;
            }

            /* BACK SIDE */
            .back-side {
              background: #f9fafb;
              justify-content: space-between;
              position: relative;
            }
            .back-side::before {
              content: '';
              position: absolute;
              top: 50%; left: 50%;
              transform: translate(-50%, -50%);
              width: 45mm; height: 45mm;
              background-image: url('/logo.jpg');
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              opacity: 0.05;
              z-index: 1;
            }
            .back-header {
              text-align: center;
              padding: 8px;
              background: #059669;
              color: white;
              font-size: 9px;
              font-weight: bold;
              z-index: 2;
            }
            .qr-container {
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              z-index: 2;
            }
            .qr-box {
              width: 30mm;
              height: 30mm;
              background: white;
              padding: 2mm;
              border-radius: 4px;
              border: 1px solid #10b981;
            }
            .qr-box img {
              width: 100%;
              height: 100%;
            }
            .qr-text {
              margin-top: 5px;
              font-size: 8px;
              font-weight: bold;
              color: #374151;
            }
            .rules {
              font-size: 6.5px;
              padding: 10px;
              z-index: 2;
              background: rgba(255,255,255,0.85);
            }
            .rules ol {
              padding-left: 14px;
              margin-top: 3px;
              color: #374151;
              line-height: 1.4;
            }

            @media print {
              body {
                background: white;
                padding: 0;
              }
              .id-card {
                box-shadow: none;
                border: 1px dashed #ccc; /* Cut guide */
              }
              @page {
                margin: 10mm;
                size: A4 portrait;
              }
            }
        `}),(0,g.jsx)(`div`,{ref:r,className:`flex flex-wrap justify-center gap-6 max-w-5xl mx-auto`,children:e.map(e=>{let t=n===`teacher`||e.nip!==void 0,r=[e.tempat_lahir,l(e.tanggal_lahir)].filter(Boolean).join(`, `);return t||c(e.kelas),(0,g.jsxs)(`div`,{className:`id-card-wrapper`,children:[(0,g.jsxs)(`div`,{className:`id-card`,children:[(0,g.jsxs)(`div`,{className:`card-header`,children:[(0,g.jsx)(`div`,{className:`logo`,children:(0,g.jsx)(`img`,{src:`/logo.jpg`,alt:`Logo`})}),(0,g.jsxs)(`div`,{className:`title-group`,children:[(0,g.jsx)(`h2`,{children:`YAYASAN RAUDHATUL YATAMA`}),(0,g.jsx)(`h1`,{children:s(e.lembaga)}),(0,g.jsx)(`h3`,{children:`KABUPATEN BOGOR`})]})]}),(0,g.jsxs)(`div`,{className:`card-body`,children:[(0,g.jsx)(`div`,{className:`photo-frame`,children:e.foto?(0,g.jsx)(`img`,{src:u(e.foto),alt:e.nama,onError:t=>{t.target.onerror=null;let n=e.jenis_kelamin===`P`?`ec4899`:`3b82f6`;t.target.src=`https://ui-avatars.com/api/?name=${encodeURIComponent(e.nama)}&background=${n}&color=fff&size=200&bold=true`}}):(0,g.jsx)(`img`,{src:`https://ui-avatars.com/api/?name=${encodeURIComponent(e.nama)}&background=${e.jenis_kelamin===`P`?`ec4899`:`3b82f6`}&color=fff&size=200&bold=true`,alt:e.nama})}),(0,g.jsx)(`div`,{className:`student-name`,children:e.nama}),(0,g.jsx)(`div`,{className:`student-role`,children:t?`GURU / PENDIDIK`:`KARTU PELAJAR`}),(0,g.jsxs)(`div`,{className:`info-grid`,children:[t?(0,g.jsxs)(g.Fragment,{children:[(0,g.jsx)(`div`,{className:`info-label`,children:`NIP`}),(0,g.jsx)(`div`,{className:`info-colon`,children:`:`}),(0,g.jsx)(`div`,{className:`info-value`,children:e.nip||`-`}),(0,g.jsx)(`div`,{className:`info-label`,children:`Mapel`}),(0,g.jsx)(`div`,{className:`info-colon`,children:`:`}),(0,g.jsx)(`div`,{className:`info-value`,children:e.mata_pelajaran||`Umum`})]}):(0,g.jsxs)(g.Fragment,{children:[(0,g.jsx)(`div`,{className:`info-label`,children:`NISN`}),(0,g.jsx)(`div`,{className:`info-colon`,children:`:`}),(0,g.jsx)(`div`,{className:`info-value`,children:e.nisn||`-`})]}),(0,g.jsx)(`div`,{className:`info-label`,children:`TTL`}),(0,g.jsx)(`div`,{className:`info-colon`,children:`:`}),(0,g.jsx)(`div`,{className:`info-value`,style:{whiteSpace:`normal`},children:r||`-`}),(0,g.jsx)(`div`,{className:`info-label`,children:`Alamat`}),(0,g.jsx)(`div`,{className:`info-colon`,children:`:`}),(0,g.jsx)(`div`,{className:`info-value`,style:{fontSize:`6px`,maxWidth:`22mm`},children:e.alamat||`-`})]})]}),(0,g.jsxs)(`div`,{className:`card-footer-front`,children:[`Berlaku: `,new Date().getFullYear()+1]})]}),(0,g.jsxs)(`div`,{className:`id-card back-side`,children:[(0,g.jsxs)(`div`,{className:`back-header`,children:[`KARTU `,t?`GURU`:`PELAJAR`,` & ABSENSI`]}),(0,g.jsxs)(`div`,{className:`qr-container`,children:[(0,g.jsx)(`div`,{className:`qr-box`,children:i[e.id]&&(0,g.jsx)(`img`,{src:i[e.id],alt:`QR`})}),(0,g.jsx)(`div`,{className:`qr-text`,children:`Scan Untuk Presensi`})]}),(0,g.jsxs)(`div`,{className:`rules`,children:[(0,g.jsx)(`strong`,{children:`Ketentuan:`}),(0,g.jsxs)(`ol`,{children:[(0,g.jsx)(`li`,{children:`Kartu ini wajib dibawa setiap hari ke sekolah.`}),(0,g.jsx)(`li`,{children:`Digunakan untuk presensi kehadiran secara digital.`}),(0,g.jsx)(`li`,{children:`Apabila hilang, harap segera melapor ke Tata Usaha.`})]})]})]})]},e.id)})})]})]})}function x({selectedCount:e,targetKelas:t,setTargetKelas:n,kelasData:r,onClose:i,onSubmit:a,isPending:o}){return(0,g.jsxs)(`div`,{className:`fixed inset-0 z-[60] flex items-center justify-center p-4`,children:[(0,g.jsx)(`div`,{className:`fixed inset-0 bg-black/50 animate-fade-in`,onClick:i}),(0,g.jsxs)(`div`,{className:`relative bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-6 max-w-md w-full space-y-4 z-10 animate-slide-up`,children:[(0,g.jsxs)(`div`,{className:`flex items-center justify-between`,children:[(0,g.jsx)(`h2`,{className:`text-xl font-black text-gray-900`,children:`Naik Kelas`}),(0,g.jsx)(`button`,{onClick:i,className:`p-1 hover:bg-gray-100 rounded-lg transition-colors`,children:(0,g.jsx)(`span`,{className:`material-symbols-outlined text-gray-600`,children:`close`})})]}),(0,g.jsxs)(`div`,{className:`bg-blue-50 border-2 border-blue-300 rounded-xl p-3 text-sm text-blue-900`,children:[(0,g.jsxs)(`p`,{className:`font-medium`,children:[`✓ `,e,` siswa dipilih untuk naik kelas`]}),(0,g.jsx)(`p`,{className:`text-xs mt-1`,children:`Pilih kelas tujuan untuk memindahkan siswa terpilih`})]}),(0,g.jsxs)(`div`,{className:`space-y-2`,children:[(0,g.jsx)(`label`,{className:`block text-sm font-bold text-gray-700`,children:`Kelas Tujuan *`}),(0,g.jsxs)(`select`,{value:t,onChange:e=>n(e.target.value),className:`w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all cursor-pointer`,required:!0,children:[(0,g.jsx)(`option`,{value:``,children:`-- Pilih Kelas Tujuan --`}),r?.data?.map(e=>(0,g.jsx)(`option`,{value:e.nama,children:e.nama},e.id))]})]}),(0,g.jsxs)(`div`,{className:`flex gap-2`,children:[(0,g.jsx)(`button`,{onClick:i,className:`flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold border-2 border-gray-900 rounded-xl shadow-neo transition-all`,children:`Batal`}),(0,g.jsx)(`button`,{onClick:a,disabled:!t||o,className:`flex-1 py-3 px-4 bg-amber-100 hover:bg-amber-200 text-amber-900 font-black border-2 border-gray-900 rounded-xl shadow-neo transition-all disabled:opacity-50 disabled:cursor-not-allowed`,children:o?`Memproses...`:`Naik Kelas`})]})]})]})}f(),m();function S(){let{effectiveLembaga:e,isLoading:t}=c(),n=a(e=>e.selectedKelas),[o,d]=(0,h.useState)(!1),[f,p]=(0,h.useState)(null),[m,S]=(0,h.useState)([]),[C,ee]=(0,h.useState)(null),[w,T]=(0,h.useState)(1),[E,D]=(0,h.useState)(10),[O,k]=(0,h.useState)({isOpen:!1,count:0}),[te,A]=(0,h.useState)(!1),[ne,j]=(0,h.useState)(!1),[M,N]=(0,h.useState)([]),[P,F]=(0,h.useState)(``),[I,re]=(0,h.useState)(``),[L,R]=(0,h.useState)({lembaga:`MA`,nama:``,nisn:``,tempat_lahir:``,tanggal_lahir:``,jenis_kelamin:`L`,alamat:``,kelas:``,nomor_hp_orangtua:``,status:`aktif`}),z=r(),{data:B,isLoading:ie}=i({queryKey:[`students`,e,n],queryFn:()=>l.getAll({lembaga:e,...n&&{kelas:n}}),enabled:!t}),{data:V}=i({queryKey:[`kelas`,e],queryFn:async()=>(await(await u(()=>import(`./api-CtBGzE02.js`).then(e=>e.n).then(e=>e.default),[])).get(`/admin/kelas`,{params:{lembaga:e}})).data,enabled:!t}),H=s({mutationFn:l.create,onSuccess:()=>{z.invalidateQueries([`students`]),K(),alert(`Siswa berhasil ditambahkan`)},onError:e=>{let t=e.response?.data?.message||e.message||`Unknown error`,n=e.response?.data?.errors;alert(`Gagal menambah siswa: ${t}\n${n?JSON.stringify(n,null,2):``}`)}}),U=s({mutationFn:({id:e,data:t})=>l.update(e,t),onSuccess:()=>{z.invalidateQueries([`students`]),K(),alert(`Siswa berhasil diupdate`)},onError:e=>{let t=e.response?.data?.message||e.message||`Unknown error`,n=e.response?.data?.errors;alert(`Gagal update siswa: ${t}\n${n?JSON.stringify(n,null,2):``}`)}}),W=s({mutationFn:l.delete,onSuccess:()=>{z.invalidateQueries([`students`]),alert(`Siswa berhasil dihapus`)},onError:e=>{alert(`Gagal menghapus siswa: `+(e.message||`Unknown error`))}}),G=s({mutationFn:async e=>(await(await u(()=>import(`./api-CtBGzE02.js`).then(e=>e.n).then(e=>e.default),[])).post(`/attendance/students/promote-class`,e)).data,onSuccess:e=>{z.invalidateQueries([`students`]),S([]),A(!1),F(``),alert(e.message||`Berhasil menaikkan ${e.data.count} siswa ke kelas ${e.data.target_kelas}`)},onError:e=>{alert(e.response?.data?.message||`Gagal menaikkan kelas siswa`)}}),K=()=>{d(!1),p(null),R({lembaga:e||`MA`,nama:``,nisn:``,tempat_lahir:``,tanggal_lahir:``,jenis_kelamin:`L`,alamat:``,kelas:``,nomor_hp_orangtua:``,status:`aktif`})},q=e=>{p(e),R({lembaga:e.lembaga,nama:e.nama,nisn:e.nisn||``,tempat_lahir:e.tempat_lahir||``,tanggal_lahir:e.tanggal_lahir||``,jenis_kelamin:e.jenis_kelamin,alamat:e.alamat||``,kelas:e.kelas||``,nomor_hp_orangtua:e.nomor_hp_orangtua||``,status:e.status}),d(!0)},[J,Y]=(0,h.useState)(!1),ae=async e=>{Y(!0);try{let t=L.lembaga;if(L.lembaga){let e=L.lembaga.toLowerCase();e===`ma`?t=`MA`:e===`mts`&&(t=`MTs`)}let n={...L,lembaga:t};if(f){if(await U.mutateAsync({id:f.id,data:n}),e)try{console.log(`Uploading photo for student:`,f.id);let t=await l.uploadPhoto(f.id,e);console.log(`Photo uploaded:`,t),z.invalidateQueries([`students`]),alert(`Siswa dan foto berhasil diupdate`)}catch(e){console.error(`Photo upload failed:`,e),alert(`Siswa berhasil diupdate, tapi foto gagal diupload: `+(e.response?.data?.message||e.message))}}else{let t=await H.mutateAsync(n);if(e&&t?.data?.id)try{console.log(`Uploading photo for new student:`,t.data.id);let n=await l.uploadPhoto(t.data.id,e);console.log(`Photo uploaded:`,n),z.invalidateQueries([`students`]),alert(`Siswa dan foto berhasil ditambahkan`)}catch(e){console.error(`Photo upload failed:`,e),alert(`Siswa berhasil ditambahkan, tapi foto gagal diupload: `+(e.response?.data?.message||e.message))}}}finally{Y(!1)}},oe=e=>{confirm(`Yakin ingin menghapus siswa ini?`)&&W.mutate(e)},se=()=>{if(m.length===0){alert(`Pilih siswa terlebih dahulu`);return}A(!0)},ce=()=>{if(!P){alert(`Pilih kelas tujuan terlebih dahulu`);return}confirm(`Naikkan ${m.length} siswa ke kelas ${P}?`)&&G.mutate({student_ids:m,target_kelas:P})},X=e=>{e.target.checked?S(Z.map(e=>e.id)):S([])},le=e=>{m.includes(e)?S(m.filter(t=>t!==e)):S([...m,e])},ue=()=>{if(m.length===0){alert(`Pilih siswa terlebih dahulu`);return}let e=Z.filter(e=>m.includes(e.id));N(e),j(!0)},de=async e=>{try{let t=e.uuid,n=document.createElement(`canvas`);await y.toCanvas(n,t,{width:300,margin:2});let r=document.createElement(`a`);r.download=`siswa-${e.nama.replace(/\s+/g,`-`)}.png`,r.href=n.toDataURL(),r.click()}catch(e){alert(`Gagal download QR: `+e.message)}},Z=(B?.data||[]).filter(e=>e.nama.toLowerCase().includes(I.toLowerCase())||e.nisn&&e.nisn.includes(I)),Q=Math.ceil(Z.length/E),$=(w-1)*E,fe=Z.slice($,$+E);return(0,g.jsxs)(`div`,{className:`max-w-5xl mx-auto space-y-6 landscape:space-y-3`,children:[(0,g.jsxs)(`div`,{className:`flex flex-col sm:flex-row items-center justify-between gap-3`,children:[(0,g.jsxs)(`div`,{className:`w-full sm:w-64 relative`,children:[(0,g.jsx)(`input`,{type:`text`,placeholder:`Cari nama atau NISN...`,value:I,onChange:e=>re(e.target.value),className:`w-full pl-9 pr-3 py-2 bg-white border-2 md:border-3 border-gray-900 rounded-xl text-xs md:text-sm font-bold shadow-neo focus:ring-0 focus:outline-none`}),(0,g.jsx)(`span`,{className:`material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-lg`,children:`search`})]}),(0,g.jsxs)(`div`,{className:`flex items-center gap-2 w-full sm:w-auto justify-end`,children:[m.length>0&&(0,g.jsxs)(g.Fragment,{children:[(0,g.jsxs)(`button`,{onClick:ue,className:`py-1 px-3 sm:px-4 bg-white text-gray-900 font-bold border-2 border-gray-900 rounded-lg hover:bg-gray-100 flex items-center justify-center shadow-sm`,title:`Cetak Kartu Massal`,children:[(0,g.jsx)(`span`,{className:`material-symbols-outlined text-lg sm:text-base mr-0 sm:mr-2`,children:`print`}),(0,g.jsxs)(`span`,{className:`hidden sm:inline`,children:[`Cetak (`,m.length,`)`]}),(0,g.jsxs)(`span`,{className:`sm:hidden`,children:[`(`,m.length,`)`]})]}),(0,g.jsxs)(`button`,{onClick:se,className:`flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-100 text-amber-800 font-bold border-2 border-gray-900 rounded-xl shadow-neo hover:clean-shadow-md transition-all text-xs md:text-sm`,children:[(0,g.jsx)(`span`,{className:`material-symbols-outlined text-lg`,children:`school`}),(0,g.jsxs)(`span`,{className:`hidden sm:inline`,children:[`Naik (`,m.length,`)`]}),(0,g.jsxs)(`span`,{className:`sm:hidden`,children:[`Naik (`,m.length,`)`]})]})]}),(0,g.jsxs)(`button`,{onClick:()=>{K(),d(!0)},className:`hidden md:flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-green text-gray-900 font-black border-2 md:border-3 border-gray-900 rounded-xl shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all text-sm`,children:[(0,g.jsx)(`span`,{className:`material-symbols-outlined text-lg`,children:`add`}),`Tambah Data`]})]})]}),(0,g.jsx)(_,{isOpen:o,onClose:K,editingStudent:f,formData:L,setFormData:R,onSubmit:ae,isPending:H.isPending||U.isPending||J,kelasData:V}),(0,g.jsxs)(`div`,{className:`flex items-center justify-between px-1 py-0.5`,children:[(0,g.jsxs)(`label`,{className:`flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none`,children:[(0,g.jsx)(`input`,{type:`checkbox`,checked:m.length===Z.length&&Z.length>0,onChange:X,className:`w-4 h-4 rounded border-2 border-gray-900 text-primary-green focus:ring-0 cursor-pointer`}),(0,g.jsx)(`span`,{children:`Pilih Semua Siswa`})]}),(0,g.jsxs)(`div`,{className:`text-[10px] sm:text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-0.5 border-2 border-gray-900 rounded-full shadow-sm`,children:[`Total: `,Z.length,` Siswa`]})]}),(0,g.jsx)(`div`,{className:`space-y-3`,children:ie?(0,g.jsx)(`div`,{className:`bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-8 text-center font-bold text-gray-600 shadow-neo`,children:`Loading data siswa...`}):Z.length===0?(0,g.jsx)(`div`,{className:`bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-8 text-center font-bold text-gray-600 shadow-neo`,children:`Belum ada data siswa`}):fe.map(e=>(0,g.jsx)(v,{student:e,isSelected:m.includes(e.id),onSelect:le,onDownloadQR:de,onShowCard:e=>{N([e]),j(!0)},onEdit:q,onDelete:oe,isDeletePending:W.isPending,activeDropdown:C,setActiveDropdown:ee},e.id))}),Z.length>0&&(0,g.jsxs)(`div`,{className:`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 pb-12`,children:[(0,g.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,g.jsx)(`span`,{className:`text-xs md:text-sm font-bold text-gray-700`,children:`Tampilkan:`}),(0,g.jsxs)(`select`,{value:E,onChange:e=>{D(Number(e.target.value)),T(1)},className:`border-2 border-gray-400 rounded-lg px-2 py-1 font-bold text-xs md:text-sm text-gray-900 bg-transparent focus:outline-none focus:border-primary-green cursor-pointer`,children:[(0,g.jsx)(`option`,{value:10,children:`10`}),(0,g.jsx)(`option`,{value:15,children:`15`}),(0,g.jsx)(`option`,{value:25,children:`25`}),(0,g.jsx)(`option`,{value:50,children:`50`})]}),(0,g.jsx)(`span`,{className:`text-xs md:text-sm font-bold text-gray-700`,children:`data`})]}),(0,g.jsxs)(`div`,{className:`flex items-center gap-3`,children:[(0,g.jsx)(`button`,{onClick:()=>T(e=>Math.max(1,e-1)),disabled:w===1,className:`p-1.5 md:p-2 text-gray-800 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all`,children:(0,g.jsx)(`span`,{className:`material-symbols-outlined text-sm md:text-base`,children:`chevron_left`})}),(0,g.jsxs)(`span`,{className:`text-xs md:text-sm font-bold text-gray-700`,children:[`Halaman `,w,` dari `,Q||1]}),(0,g.jsx)(`button`,{onClick:()=>T(e=>Math.min(Q,e+1)),disabled:w===Q||Q===0,className:`p-1.5 md:p-2 text-gray-800 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all`,children:(0,g.jsx)(`span`,{className:`material-symbols-outlined text-sm md:text-base`,children:`chevron_right`})})]})]}),(0,g.jsx)(`button`,{onClick:()=>{K(),d(!0)},className:`md:hidden fixed right-5 z-40 w-14 h-14 bg-primary-green text-gray-900 font-black border-3 border-gray-900 rounded-full shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all flex items-center justify-center group portrait:bottom-24 landscape:bottom-6`,title:`Tambah Siswa`,children:(0,g.jsx)(`span`,{className:`material-symbols-outlined text-3xl group-hover:scale-110 transition-transform`,children:`add`})}),O.isOpen&&(0,g.jsxs)(`div`,{className:`fixed inset-0 z-[60] flex items-center justify-center p-4`,children:[(0,g.jsx)(`div`,{className:`fixed inset-0 bg-black/50 animate-fade-in`,onClick:()=>k({isOpen:!1,count:0})}),(0,g.jsxs)(`div`,{className:`relative bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-6 max-w-sm w-full space-y-4 z-10 animate-slide-up text-center`,children:[(0,g.jsx)(`div`,{className:`w-14 h-14 bg-emerald-100 border-2 border-gray-900 rounded-full flex items-center justify-center text-emerald-600 mx-auto`,children:(0,g.jsx)(`span`,{className:`material-symbols-outlined text-3xl font-black`,children:`folder_zip`})}),(0,g.jsx)(`h2`,{className:`text-xl font-black text-gray-900`,children:`Download Berhasil!`}),(0,g.jsxs)(`p`,{className:`text-sm text-gray-600 font-medium leading-relaxed`,children:[`Berhasil mengunduh`,` `,(0,g.jsxs)(`span`,{className:`font-bold text-gray-900`,children:[O.count,` QR Code`]}),` `,`siswa ke dalam berkas ZIP.`]}),(0,g.jsx)(`button`,{type:`button`,onClick:()=>k({isOpen:!1,count:0}),className:`w-full py-3 px-4 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo transition-all`,children:`Selesai`})]})]}),te&&(0,g.jsx)(x,{selectedCount:m.length,targetKelas:P,setTargetKelas:F,kelasData:V,onClose:()=>{A(!1),F(``)},onSubmit:ce,isPending:G.isPending}),ne&&M?.length>0&&(0,g.jsx)(b,{students:M,onClose:()=>{j(!1),N([]),M.length>1&&S([])}})]})}export{S as default};