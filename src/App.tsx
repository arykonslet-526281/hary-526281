/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  auth, 
  db, 
  storage,
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp,
  ref,
  uploadBytes,
  getDownloadURL
} from './firebase';
import { 
  LogOut, 
  Plus, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  ChevronRight, 
  ChevronLeft, 
  LayoutDashboard,
  Trash2,
  Edit2,
  Menu,
  X,
  User as UserIcon,
  Upload,
  Link as LinkIcon,
  Info,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// --- Types ---

interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface ProfilInovasi {
  namaInovasi: string;
  kategori: 'Perangkat Daerah' | 'Desa' | 'Masyarakat' | '';
  perangkatDaerah?: string;
  desa?: string;
  rancangBangun: string;
  tujuan: string;
  manfaat: {
    opd: string;
    stakeholder: string;
    masyarakat: string;
  };
  hasil: string;
}

interface IndicatorValue {
  value: string;
  fileUrl?: string;
  fileName?: string;
  videoUrl?: string;
}

interface IndikatorInovasi {
  regulasi: IndicatorValue;
  sdm: IndicatorValue;
  anggaran: IndicatorValue;
  penggunaanIT: IndicatorValue;
  bimtek: IndicatorValue;
  rkpd: IndicatorValue;
  aktor: IndicatorValue;
  pelaksana: IndicatorValue;
  jejaring: IndicatorValue;
  sosialisasi: IndicatorValue;
  pedoman: IndicatorValue;
  informasi: IndicatorValue;
  proses: IndicatorValue;
  pengaduan: IndicatorValue;
  online: IndicatorValue;
  replikasi: IndicatorValue;
  kecepatan: IndicatorValue;
  kemanfaatan: IndicatorValue;
  monev: IndicatorValue;
  kualitas: IndicatorValue;
}

interface InnovationForm {
  id?: string;
  userId: string;
  createdAt: any;
  updatedAt?: any;
  status: 'draft' | 'submitted';
  profilInovasi: ProfilInovasi;
  indikatorInovasi: IndikatorInovasi;
}

const INDICATOR_METADATA: Record<keyof IndikatorInovasi, { label: string; deskripsi: string; dataDukung: string; keterangan: string; hasVideo?: boolean }> = {
  regulasi: {
    label: "Regulasi Inovasi Daerah",
    deskripsi: "Regulasi yang menetapkan nama-nama inovasi daerah yang menjadi landasan operasional penerapan Inovasi Daerah",
    dataDukung: "Perda atau Perkada atau SK Kepala Daerah atau SK Kepala Perangkat Daerah serta halaman yang memuat nama inovasi yang sah dan valid serta sesuai pada tahun saat penerapan (pdf)",
    keterangan: "Regulasi yang isinya menetapkan satu/lebih NAMA: Perda penetapan inovasi; atau Perbup penetapan inovasi; atau SK Sekda/Kepala OPD tentang penetapan inovasi"
  },
  sdm: {
    label: "Ketersediaan SDM Terhadap Inovasi Daerah",
    deskripsi: "Jumlah SDM yang mengelola inovasi (minimal 31 orang)",
    dataDukung: "Surat Keputusan (SK) atau Surat Tugas (ST) yang ditetapkan oleh Kepala Daerah/Kepala Perangkat Daerah pada tahun penerapan (pdf).",
    keterangan: "SK atau Surat Tugas dari Bupati/Sekda/Kepala OPD. Bisa untuk data dukung No. 2, 7, 8, 9 dengan melengkapi: Jumlah minimal 31 orang; Melibatkan minimal 5 OPD (jika memungkinkan); Melibatkan 5 aktor/stakeholders (Pemerintah, Pelaku Bisnis, Komunitas, Akademisi, Media Massa). Alternatif 5 Aktor/Stakeholders: 1 Pemerintah, 2 Pelaku Bisnis, 3 Komunitas, 4 Akademisi, 5 Media Massa"
  },
  anggaran: {
    label: "Dukungan Anggaran",
    deskripsi: "Anggaran inovasi daerah dalam APBD/APBDes dengan tahapan penerapan (penyediaan sarana prasarana, sumber daya manusia dan layanan, bimtek, urusan jenis layanan).",
    dataDukung: "Dokumen anggaran (3 tahun terakhir) yang memuat program dan kegiatan inovasi daerah sesuai dengan tahun anggaran (pdf) → DPA kegiatan yang mendukung inovasi",
    keterangan: "DPA APBD/APBDes yang ada nomor dan tanda tangan pengesahannya. DPA Tahun 2025, 2024, 2023. Diambil halaman depan yang ada Nomor DPA, program/rekening yang terkait, halaman tanda tangan. DPA dipisah PDF sendiri2 per tahunnya. Dalam tiap PDF DPA diberi highlight atau tanda kotak/blok warna pada rekening mana yang dimaksud"
  },
  penggunaanIT: {
    label: "Penggunaan IT",
    deskripsi: "Penggunaan IT dalam pelaksanaan Inovasi yang diterapkan",
    dataDukung: "Foto kegiatan/gambar screenshot (SS) layar (pdf)",
    keterangan: "Nilai tertinggi: Pelaksanaan kerja sudah didukung sistem informasi online/daring. Jika didukung app android -> SS app android; Jika didukung web/aplikasi -> SS web/aplikasi; Jika didukung whatsapp -> SS WA atau GWA; Jika didukung Googledocs/Googlesheet -> SS Googledocs/Googlesheet; dll"
  },
  bimtek: {
    label: "Bimtek Inovasi",
    deskripsi: "Peningkatan kapasitas dan kompetensi pelaksana inovasi daerah",
    dataDukung: "SK Kegiatan/Surat Tugas, Daftar Hadir, dan Undangan kegiatan bimtek/training/TOT/sharing/FGD/kegiatan transfer pengetahuan lainnya (pdf).",
    keterangan: "SK Kegiatan/Surat Tugas/Undangan dan Daftar Hadir. Bimtek/ training/ TOT/sharing/ FGD/ kegiatan transfer pengetahuan lainnya. Buat minimal 3x bimtek/training/TOT/sharing/FGD, dll"
  },
  rkpd: {
    label: "Program dan Kegiatan inovasi Perangkat Daerah dalam RKPD",
    deskripsi: "Inovasi Perangkat Daerah telah dituangkan dalam program pembangunan daerah",
    dataDukung: "Cover, Bab, bagian, dan halaman dokumen RKPD yang memuat program dan kegiatan inovasi daerah (pdf) → minimal Cover RKPD dan halaman yang memuat perencanaan anggaran",
    keterangan: "RKPD 2024, 2023, 2022. RKPD yang diupload -> Cover RKPD, halaman depan perbup/kop garuda, ttd bupati dan matriks anggaran). RKPD tolong dipisah PDF sendiri2 per tahun. Dalam tiap PDF RKPD tolong diberi tanda kotak/blok warna program/kegiatan/rekening mana yang dimaksud"
  },
  aktor: {
    label: "Keterlibatan Aktor Inovasi",
    deskripsi: "Keikutsertaan unsur stakeholder dalam pelaksanaan inovasi daerah (T-1 dan T-2)",
    dataDukung: "Surat Keputusan (SK) Perangkat Daerah/Undangan rapat dalam 2 (dua) tahun terakhir (pdf)",
    keterangan: "Sama dengan SK No. 2, atau Undangan rapat yang mengundang 5 unsur stakeholder: 1 Pemerintah, 2 Pelaku Bisnis, 3 Komunitas, 4 Akademisi, 5 Media Massa"
  },
  pelaksana: {
    label: "Pelaksana Inovasi Daerah",
    deskripsi: "Penetapan tim pelaksana inovasi daerah",
    dataDukung: "SK Penetapan oleh Kepala Daerah/Kepala Perangkat Daerah dalam 2 (dua) tahun terakhir (pdf)",
    keterangan: "Sama dengan SK No. 2."
  },
  jejaring: {
    label: "Jejaring Inovasi",
    deskripsi: "Jumlah Perangkat Daerah yang terlibat dalam penerapan inovasi (dalam 2 tahun terakhir)",
    dataDukung: "SK/ST tim pengelola penerapan inovasi daerah dalam 2 (dua) tahun terakhir (pdf)",
    keterangan: "Sama dengan SK No. 2. Buat kolaborasi dengan minimal 5 OPD terkait (dikait-kaitkan secara tusi, dll)"
  },
  sosialisasi: {
    label: "Sosialisasi Inovasi Daerah",
    deskripsi: "Penyebarluasan informasi kebijakan inovasi daerah",
    dataDukung: "Dokumentasi dan publikasi (foto kegiatan/seminar/ display pameran inovasi atau screenshot konten pada media sosial/ website atau pemberitaan media massa cetak/ elektronik) (pdf)",
    keterangan: "Screenshot konten pada: Media Berita baik cetak maupun online, TV, dll. Konten melalui Website/Media Sosial -> buat konten penyebaran informasi terkait inovasi ini di medsos FB/IG/Tik tok/Youtube, dll"
  },
  pedoman: {
    label: "Pedoman Teknis",
    deskripsi: "Ketentuan dasar penggunaan inovasi daerah berupa buku petunjuk/ manual book",
    dataDukung: "Dokumen manual book/buku petunjuk elektronik (pdf) atau screenshot penggunaan inovasi daerah",
    keterangan: "Pedoman teknis/manual book berupa buku yang dapat diakses secara online atau berupa video tutorial. Pedoman teknis/manual book diunggah di website atau google drive/dropbox dan link-nya dicantumkan dalam PDF tersebut",
    hasVideo: true
  },
  informasi: {
    label: "Kemudahan Informasi Layanan",
    deskripsi: "Kemudahan mendapatkan informasi layanan",
    dataDukung: "Nomor layanan telepon/screenshot email/akun media sosial/nama aplikasi online/ dokumen foto buku tamu layanan (pdf)",
    keterangan: "Jika aplikasi -> SS Menu Hubungi Kami (layanan telepon, email). Jika non aplikasi -> Buat Flyer/Pamflet berupa info Nomor HP/WA Layanan dan Email lalu diposting di medsos (IG/FB/dll), kemudian kemudian di screenshoot untuk data dukung"
  },
  proses: {
    label: "Kemudahan Proses Inovasi Yang Dihasilkan",
    deskripsi: "Indikator ini ditujukan untuk mengukur kecepatan layanan inovasi yang diperoleh oleh pengguna.",
    dataDukung: "SOP pelaksanaan inovasi daerah yang memuat durasi waktu layanan (pdf)",
    keterangan: "Data dukung: SOP pelaksanaan inovasi -> ada nomor SOP, tahapan pelaksanaan inovasi (flowchart), durasi waktu yang dibutuhkan, tanda tangan pengesahan"
  },
  pengaduan: {
    label: "Penyelesaian Layanan Pengaduan",
    deskripsi: "Rasio pengaduan yang tertangani dalam tahun terakhir, meliputi keluhan, kritik konstruktif, saran, dan pengaduan lainnya terkait layanan inovasi.",
    dataDukung: "dokumen foto kegiatan penyelesaian pengaduan/screenshot media layanan pengaduan yang disertai dengan rekapitulasi pengaduan dan persentase rasio penyelesaian pengaduan (pdf)",
    keterangan: "SS Layanan Aduan di aplikasi dan jawaban penyelesaiannya, atau SS beberapa aduan menggunakan DM IG atau WA dan dibalas penyelesaiannya, atau Buku Aduan, atau Kotak Saran + jawaban penyelesaiannya dan difoto. Kemudian buat persentase penyelesaian aduan (DIKETIK DI WORD TENTANG PENYELESAIAN ADUAN/ MASALAH) -> misal aduan masuk 5; penyelesaian 5 jadi Rasio penyelesaian aduan= 5/5x100%= 100%. Rasio penyelesaian aduan minimal dibuat 81% supaya nilainya tinggi"
  },
  online: {
    label: "Online Sistem",
    deskripsi: "Perangkat jaringan prosedur yang dibuat secara daring.",
    dataDukung: "Screenshot aplikasi layanan inovasi pada bagian beranda/halaman depan dan bagian proses layanan (pdf)",
    keterangan: "SS web aplikasi atau aplikasi mobile (android atau ios) yang sudah terintegrasi dengan layanan lain, atau SS dukungan melalui web aplikasi atau aplikasi mobile (android atau ios), atau SS dukungan melalui informasi website atau sosial media"
  },
  replikasi: {
    label: "Replikasi",
    deskripsi: "Inovasi Daerah telah direplikasi oleh daerah lain (T-2 sampai dengan T-1)",
    dataDukung: "Dokumen PKS/MoU/Surat Pernyataan dari pemda yang mereplikasi/ dokumen replikasi lainnya (pdf)",
    keterangan: "Perjanjian Kerja Sama/MoU/Surat Pernyataan dari pemda yang mereplikasi/ dokumen replikasi lainnya (pdf)."
  },
  kecepatan: {
    label: "Kecepatan Penciptaan Inovasi",
    deskripsi: "Satuan waktu yang digunakan untuk menciptakan inovasi daerah yang kompleks",
    dataDukung: "Dokumen/laporan/proposal inovasi daerah yang memuat tahapan- tahapan proses dan durasi penciptaan inovasi daerah (pdf).",
    keterangan: "pembuatan Inovasi -> proposal bisa dibuat dari profil inovasi (rancang bangun, tujuan, manfaat, hasil), dan ditambah tabel tahapan pembuatan"
  },
  kemanfaatan: {
    label: "Kemanfaatan Inovasi",
    deskripsi: "Jumlah pengguna atau penerima manfaat inovasi daerah (2 tahun terakhir)",
    dataDukung: "Daftar penerima manfaat inovasi (untuk layanan luring) (pdf) atau screenshot jumlah pengguna/ penerima manfaat inovasi daerah (untuk layanan daring) (pdf)",
    keterangan: "Satuan Orang. Daftar penerima manfaat -> dibuktikan misalnya dengan BEBERAPA daftar hadir/buku tamu, SS Jml personil GWA, Followers IG, dll. Jumlah pengguna atau penerima manfaat lebih baik jika 201 orang keatas. Alternatif lain: Satuan unit, Satuan biaya (rupiah), Satuan pendapatan (rupiah), Satuan hasil produk/satuan penjualan"
  },
  monev: {
    label: "Monitoring dan Evaluasi Inovasi Daerah",
    deskripsi: "Kepuasan pelaksanaan penggunaan inovasi daerah (2 Tahun Terakhir)",
    dataDukung: "Screenshot testimoni pengguna atau laporan survei kepuasan masyarakat/ laporan hasil penelitian (pdf)",
    keterangan: "Hasil laporan monev eksternal berdasarkan hasil penelitian/kajian/analisis, atau Hasil pengukuran kepuasan pengguna dari evaluasi Survei Kepuasan Masyarakat (SKM), atau Hasil laporan monev internal Perangkat Daerah"
  },
  kualitas: {
    label: "Kualitas Inovasi Daerah",
    deskripsi: "Kualitas inovasi daerah dapat dibuktikan dengan video penerapan inovasi daerah (2 Tahun Terakhir) (pengisian dengan link video)",
    dataDukung: "Mengunggah video penerapan inovasi dengan durasi maksimal 5 menit (mp4/MOV) atau link google drive atau youtube dengan ketentuan video memvisualisasikan 5 unsur substansi",
    keterangan: "Dibuktikan dengan: Mengunggah video penerapan inovasi dengan durasi maksimal 5 menit (mp4/MOV) atau link google drive atau youtube dengan ketentuan video memvisualisasikan 5 unsur substansi: 1 Latar belakang inovasi; 2 Penjaringan ide; 3 Pemilihan ide; 4 Manfaat inovasi; dan 5 Dampak inovasi.",
    hasVideo: true
  }
};

const PERANGKAT_DAERAH_OPTIONS = [
  "Sekretariat Daerah",
  "Sekretariat DPRD",
  "Inspektorat Daerah",
  "Badan Kesatuan Bangsa dan Politik",
  "Badan Penanggulangan Bencana Daerah",
  "Badan Kepegawaian dan Pengembangan Sumber Daya Manusia",
  "Badan Pengelolaan Keuangan dan Pendapatan Daerah",
  "Badan Perencanaan Pembangunan, Penelitian dan Pengembangan Daerah",
  "Dinas Kependudukan dan Catatan Sipil",
  "Dinas Komunikasi, Informatika, Statistik dan Persandian",
  "Satuan Polisi Pamong Praja, Pemadan Kebakaran dan Penyelamatan",
  "Dinas Perpustakaan dan Kearsipan",
  "Dinas Kesehatan",
  "Dinas Pendidikan, Pemuda dan Olahraga",
  "Dinas Pemberdayaan Perempuan, Pelindungan Anak, Pengendalian Penduduk dan Keluarga Berencana",
  "Dinas Sosial",
  "Dinas Penanaman Modal, Pelayanan Terpadu Satu Pintu",
  "Dinas Perdagangan, Koperasi, Usaha Kecil dan Menengah",
  "Dinas Perindustrian, dan Tenaga Kerja",
  "Dinas Perikanan",
  "Dinas Pertanian dan Ketahanan Pangan",
  "Dinas Lingkungan Hidup",
  "Dinas Pariwisata dan Kebudayaan",
  "Dinas Pekerjaan Umum dan Tata Ruang",
  "Dinas Perumahan dan Kawasan Permukiman",
  "Dinas Perhubungan",
  "Dinas Pemberdayaan Masyarakat dan Desa",
  "Kecamatan Benteng",
  "Kecamatan Bontoharu",
  "Kecamatan Bontomanai",
  "Kecamatan Bontomatene",
  "Kecamatan Bontosikuyu",
  "Kecamatan Buki",
  "Kecamatan Pasilambena",
  "Kecamatan Pasimarannu",
  "Kecamatan Pasimasungggu",
  "Kecamatan Pasimasungggu Timur",
  "Kecamatan Takabonerate"
];

const DESA_OPTIONS = [
  "Kel. Batangmata",
  "Desa Maharayya",
  "Desa Barat Lambongan",
  "Desa Bungaiya",
  "Desa Menara Indah",
  "Desa Pamatata",
  "Desa Tanete",
  "Desa Kayu Bau",
  "Desa Bontona Saluk",
  "Kel. Batangmata Sapo",
  "Desa Onto",
  "Desa Tamalanrea",
  "Desa Buki",
  "Desa Lalang Bata",
  "Desa Bonto Lempangan",
  "Desa Kohala",
  "Desa Balang Butung",
  "Desa Buki Timur",
  "Desa Mekar Indah",
  "Desa Polebungin",
  "Desa Bonea Makmur",
  "Desa Bonea Timur",
  "Desa Bontomarannu",
  "Desa Mare-mare",
  "Desa Parak",
  "Desa Barugaiya",
  "Desa Jambuyya",
  "Desa Bontokoraang",
  "DesaKaburu",
  "Kel. Benteng",
  "Kel. Benteng Utara",
  "Kel. Benteng Selatan",
  "Kel. Bontobangung",
  "Desa Bontoborusu",
  "Desa Kahu-Kahu",
  "Desa Bontolebang",
  "Desa Bontotangnga",
  "Kel. Putabangung",
  "Desa Kale Padang",
  "Desa Bontosunggu",
  "Desa Harapan ",
  "Desa Laiyolo Baru",
  "Desa Laiyolo",
  "Desa Binanga Sombayya",
  "Desa Lantibongan",
  "Desa Lowa ",
  "Desa Patilereng",
  "Desa Patikarya",
  "Desa Appatana",
  "Desa Tambolongan",
  "Desa Polassi",
  "Desa Khusus Bahuluang",
  "Desa Batang",
  "Desa Jinato",
  "Desa Tambuna",
  "Desa Kayuadi ",
  "Desa Nyiur Indah",
  "Desa Tarupa",
  "Desa Latondu",
  "Desa Rajuni",
  "Desa Pasitallu",
  "Desa Bonto Bulaeng",
  "Desa Lembang Baji",
  "Desa Bontomalling",
  "Desa Bontobaru",
  "Desa Bontojati",
  "Desa Ujung",
  "Desa Kembang Ragi",
  "Desa Ma'minasa",
  "Desa Tanamalala",
  "Desa Bontosaile",
  "Desa Masungke",
  "Desa Labuang Pamajang",
  "Desa Teluk Kampe",
  "Desa Bonerate",
  "Desa Majapahit",
  "Desa Komba-Komba",
  "Desa Bonea",
  "Desa Lambego",
  "Desa Batu Bingkung",
  "Desa Sambali",
  "Desa Lamantu",
  "Desa Kalaotoa",
  "Desa Lembang Matene",
  "Desa Karumpa",
  "Desa Pulo Madu",
  "Desa Garaupa",
  "Desa Garaupa Raya"
];

const INITIAL_PROFIL: ProfilInovasi = {
  namaInovasi: '',
  kategori: '',
  perangkatDaerah: '',
  desa: '',
  rancangBangun: '',
  tujuan: '',
  manfaat: {
    opd: '',
    stakeholder: '',
    masyarakat: '',
  },
  hasil: '',
};

const INITIAL_INDIKATOR: IndikatorInovasi = {
  regulasi: { value: '' },
  sdm: { value: '' },
  anggaran: { value: '' },
  penggunaanIT: { value: '' },
  bimtek: { value: '' },
  rkpd: { value: '' },
  aktor: { value: '' },
  pelaksana: { value: '' },
  jejaring: { value: '' },
  sosialisasi: { value: '' },
  pedoman: { value: '' },
  informasi: { value: '' },
  proses: { value: '' },
  pengaduan: { value: '' },
  online: { value: '' },
  replikasi: { value: '' },
  kecepatan: { value: '' },
  kemanfaatan: { value: '' },
  monev: { value: '' },
  kualitas: { value: '' },
};

// --- Components ---

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'form'>('dashboard');
  const [currentForm, setCurrentForm] = useState<InnovationForm | null>(null);
  const [innovations, setInnovations] = useState<InnovationForm[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userProfile: UserProfile = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        };
        setUser(userProfile);
        
        // Save user to Firestore
        await setDoc(doc(db, 'users', firebaseUser.uid), userProfile, { merge: true });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Innovations Listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'innovations'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InnovationForm));
      setInnovations(data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    if (loginLoading) return;
    setLoginLoading(true);
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/popup-blocked') {
        setLoginError('Popup diblokir oleh browser. Mohon izinkan popup atau buka aplikasi di tab baru.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        setLoginError('Permintaan login dibatalkan.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setLoginError('Jendela login ditutup sebelum selesai.');
      } else {
        setLoginError('Gagal login: ' + error.message);
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('dashboard');
      setCurrentForm(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const startNewForm = () => {
    if (!user) return;
    setCurrentForm({
      userId: user.uid,
      createdAt: Timestamp.now(),
      status: 'draft',
      profilInovasi: { ...INITIAL_PROFIL },
      indikatorInovasi: { ...INITIAL_INDIKATOR },
    });
    setView('form');
  };

  const editForm = (innovation: InnovationForm) => {
    setCurrentForm(innovation);
    setView('form');
  };

  const deleteForm = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus inovasi ini?')) return;
    try {
      await deleteDoc(doc(db, 'innovations', id));
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} loading={loginLoading} error={loginError} />;
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-stone-200 p-4 flex items-center justify-between">
        <h1 className="font-serif italic font-bold text-emerald-800">Sistem Inovasi</h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        user={user} 
        onLogout={handleLogout} 
        view={view} 
        setView={setView} 
      />

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          {view === 'dashboard' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Dashboard 
                innovations={innovations} 
                onNew={startNewForm} 
                onEdit={editForm} 
                onDelete={deleteForm} 
              />
            </motion.div>
          ) : (
            <motion.div 
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <InnovationFormView 
                user={user}
                form={currentForm!} 
                onBack={() => setView('dashboard')} 
                onSave={async (updated) => {
                  if (updated.id) {
                    await updateDoc(doc(db, 'innovations', updated.id), { ...updated, updatedAt: Timestamp.now() });
                  } else {
                    await addDoc(collection(db, 'innovations'), { ...updated, createdAt: Timestamp.now() });
                  }
                  setView('dashboard');
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Sub-components ---

function LoginScreen({ onLogin, loading, error }: { onLogin: () => void, loading: boolean, error: string | null }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0] p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[32px] p-12 shadow-xl shadow-stone-200/50 text-center"
      >
        <div className="mb-8 flex justify-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
            <FileText size={32} />
          </div>
        </div>
        <h1 className="text-3xl font-serif font-bold text-stone-900 mb-2">Sistem Inovasi Daerah</h1>
        <p className="text-stone-500 mb-8">Silakan masuk untuk mulai mengisi form inovasi daerah Anda.</p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-2xl flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0" />
            <p className="text-left">{error}</p>
          </div>
        )}

        <button 
          onClick={onLogin}
          disabled={loading}
          className={cn(
            "w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-4 rounded-full transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-200",
            loading && "opacity-50 cursor-not-allowed"
          )}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Masuk dengan Google
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}

function Sidebar({ isOpen, setIsOpen, user, onLogout, view, setView }: any) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  return (
    <aside className={cn(
      "fixed inset-0 z-40 md:relative md:flex md:w-72 bg-white border-r border-stone-200 transition-transform duration-300 transform",
      isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
    )}>
      <div className="flex flex-col h-full w-full p-6">
        <div className="mb-12 hidden md:block">
          <h1 className="text-2xl font-serif italic font-bold text-emerald-800">Sistem Inovasi</h1>
          <p className="text-xs text-stone-400 uppercase tracking-widest mt-1">Daerah Terintegrasi</p>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setView(item.id); setIsOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all",
                view === item.id ? "bg-emerald-50 text-emerald-700 font-medium" : "text-stone-500 hover:bg-stone-50"
              )}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-stone-100">
          <div className="flex items-center gap-3 mb-6 px-2">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full border-2 border-emerald-100" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                <UserIcon size={20} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-900 truncate">{user.displayName}</p>
              <p className="text-xs text-stone-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut size={20} />
            Keluar
          </button>
        </div>
      </div>
    </aside>
  );
}

function Dashboard({ innovations, onNew, onEdit, onDelete }: any) {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-serif font-bold text-stone-900">Dashboard Inovasi</h2>
          <p className="text-stone-500">Kelola daftar inovasi daerah Anda di sini.</p>
        </div>
        <button 
          onClick={onNew}
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3 rounded-full flex items-center gap-2 transition-all shadow-lg shadow-emerald-200"
        >
          <Plus size={20} />
          Tambah Inovasi
        </button>
      </div>

      {innovations.length === 0 ? (
        <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-stone-300">
          <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center text-stone-300 mx-auto mb-4">
            <FileText size={32} />
          </div>
          <h3 className="text-lg font-medium text-stone-900 mb-1">Belum ada inovasi</h3>
          <p className="text-stone-500 mb-6">Mulai dengan menambahkan inovasi daerah pertama Anda.</p>
          <button onClick={onNew} className="text-emerald-700 font-medium hover:underline">Tambah Inovasi Baru</button>
        </div>
      ) : (
        <div className="grid gap-4">
          {innovations.map((item: any) => (
            <div 
              key={item.id}
              className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                  item.status === 'submitted' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                )}>
                  {item.status === 'submitted' ? <CheckCircle2 size={24} /> : <FileText size={24} />}
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-lg">{item.profilInovasi.namaInovasi || 'Tanpa Nama'}</h4>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-stone-500">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider",
                      item.status === 'submitted' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {item.status === 'submitted' ? 'Terkirim' : 'Draft'}
                    </span>
                    {item.profilInovasi.kategori && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-stone-100 text-stone-600">
                        {item.profilInovasi.kategori}
                      </span>
                    )}
                    <span>•</span>
                    <span>{item.createdAt?.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onEdit(item)}
                  className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                  title="Edit"
                >
                  <Edit2 size={20} />
                </button>
                <button 
                  onClick={() => onDelete(item.id)}
                  className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  title="Hapus"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InnovationFormView(props: { user: UserProfile, form: InnovationForm, onBack: () => void, onSave: (f: InnovationForm) => any }) {
  const { user, form, onBack, onSave } = props;
  const [activeTab, setActiveTab] = useState<'profil' | 'indikator'>('profil');
  const [localForm, setLocalForm] = useState<InnovationForm>({ ...form });
  const [errors, setErrors] = useState<string[]>([]);

  const handleProfilChange = (field: string, value: any) => {
    setLocalForm(prev => ({
      ...prev,
      profilInovasi: {
        ...prev.profilInovasi,
        [field]: value
      }
    }));
  };

  const handleManfaatChange = (field: string, value: string) => {
    setLocalForm(prev => ({
      ...prev,
      profilInovasi: {
        ...prev.profilInovasi,
        manfaat: {
          ...prev.profilInovasi.manfaat,
          [field]: value
        }
      }
    }));
  };

  const handleIndikatorChange = (field: string, subfield: keyof IndicatorValue, value: string) => {
    setLocalForm(prev => ({
      ...prev,
      indikatorInovasi: {
        ...prev.indikatorInovasi,
        [field]: {
          ...(prev.indikatorInovasi[field as keyof IndikatorInovasi] as IndicatorValue),
          [subfield]: value
        }
      }
    }));
  };

  const handleFileUpload = async (field: string, file: File) => {
    if (!user) return;
    const storageRef = ref(storage, `innovations/${user.uid}/${Date.now()}_${file.name}`);
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      handleIndikatorChange(field, 'fileUrl', url);
      handleIndikatorChange(field, 'fileName', file.name);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Gagal mengunggah file.');
    }
  };

  const validate = () => {
    const newErrors: string[] = [];
    if (!localForm.profilInovasi.namaInovasi) newErrors.push('Nama Inovasi wajib diisi.');
    if (!localForm.profilInovasi.kategori) newErrors.push('Kategori Inovasi wajib dipilih.');
    if (localForm.profilInovasi.kategori === 'Perangkat Daerah' && !localForm.profilInovasi.perangkatDaerah) {
      newErrors.push('Nama Perangkat Daerah wajib dipilih.');
    }
    if (localForm.profilInovasi.kategori === 'Desa' && !localForm.profilInovasi.desa) {
      newErrors.push('Nama Desa / Kelurahan wajib dipilih.');
    }
    if (!localForm.profilInovasi.rancangBangun) {
      newErrors.push('Link Google Drive Rancang Bangun wajib diisi.');
    } else if (!localForm.profilInovasi.rancangBangun.startsWith('http')) {
      newErrors.push('Link Google Drive harus berupa URL yang valid.');
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = (status: 'draft' | 'submitted') => {
    if (status === 'submitted' && !validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    onSave({ ...localForm, status });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-stone-200 rounded-full transition-all">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-serif font-bold text-stone-900">
          {localForm.id ? 'Edit Inovasi' : 'Tambah Inovasi Baru'}
        </h2>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 flex items-start gap-3 text-red-700">
          <AlertCircle className="shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-bold mb-1">Mohon perbaiki kesalahan berikut:</p>
            <ul className="list-disc list-inside text-sm">
              {errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-stone-100 p-1 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('profil')}
          className={cn(
            "px-6 py-2 rounded-xl text-sm font-medium transition-all",
            activeTab === 'profil' ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500 hover:text-stone-700"
          )}
        >
          1. Profil Inovasi
        </button>
        <button 
          onClick={() => setActiveTab('indikator')}
          className={cn(
            "px-6 py-2 rounded-xl text-sm font-medium transition-all",
            activeTab === 'indikator' ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500 hover:text-stone-700"
          )}
        >
          2. Indikator Inovasi
        </button>
      </div>

      <div className="bg-white rounded-[32px] p-8 border border-stone-100 shadow-sm mb-8">
        {activeTab === 'profil' ? (
          <div className="space-y-6">
            <FormField label="Nama Inovasi" required>
              <input 
                type="text" 
                value={localForm.profilInovasi.namaInovasi}
                onChange={(e) => handleProfilChange('namaInovasi', e.target.value)}
                placeholder="Masukkan nama inovasi..."
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Kategori Inovasi" required>
                <select 
                  value={localForm.profilInovasi.kategori}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    handleProfilChange('kategori', val);
                    // Reset sub-options
                    handleProfilChange('perangkatDaerah', '');
                    handleProfilChange('desa', '');
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="">Pilih Kategori...</option>
                  <option value="Perangkat Daerah">Perangkat Daerah</option>
                  <option value="Desa">Desa</option>
                  <option value="Masyarakat">Masyarakat</option>
                </select>
              </FormField>

              {localForm.profilInovasi.kategori === 'Perangkat Daerah' && (
                <FormField label="Nama Perangkat Daerah" required>
                  <select 
                    value={localForm.profilInovasi.perangkatDaerah}
                    onChange={(e) => handleProfilChange('perangkatDaerah', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all bg-white"
                  >
                    <option value="">Pilih Perangkat Daerah...</option>
                    {PERANGKAT_DAERAH_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </FormField>
              )}

              {localForm.profilInovasi.kategori === 'Desa' && (
                <FormField label="Nama Desa / Kelurahan" required>
                  <select 
                    value={localForm.profilInovasi.desa}
                    onChange={(e) => handleProfilChange('desa', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all bg-white"
                  >
                    <option value="">Pilih Desa / Kelurahan...</option>
                    {DESA_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </FormField>
              )}
            </div>

            <FormField 
              label="Rancang Bangun Inovasi Daerah & Pokok Perubahan" 
              required 
            >
              <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 mb-4 text-sm text-stone-600 space-y-3">
                <p className="font-bold text-stone-800">Rancang bangun inovasi daerah dan pokok perubahan yang akan dilakukan (minimal 300 kata) dengan sistematika penulisan :</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Dasar hukum inovasi (UU/PP/Permen/Perda/Pergub/Perbup/SK/Instruksi KDH, dll)</li>
                  <li>Permasalahan (Makro atau Mikro disertai dengan data/angka)</li>
                  <li>Isu strategis (Isu global, nasional, lokal)</li>
                  <li>Metode pembaharuan (Kondisi sebelum dan setelah adanya inovasi tsb)</li>
                  <li>Keunggulan dan kebaharuan (pengembangannya apabila berupa update dan upgrade)</li>
                  <li>Tahapan inovasi/penggunaan produk (uraikan singkat tata cara penggunaan aplikasi atau tata laksana penciptaan atau pemanfaatan produk)</li>
                </ol>
              </div>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
                    <LinkIcon size={18} />
                  </div>
                  <input 
                    type="url" 
                    value={localForm.profilInovasi.rancangBangun}
                    onChange={(e) => handleProfilChange('rancangBangun', e.target.value)}
                    placeholder="Tempel link Google Drive di sini..."
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                {localForm.profilInovasi.rancangBangun && localForm.profilInovasi.rancangBangun.startsWith('http') && (
                  <a 
                    href={localForm.profilInovasi.rancangBangun} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-4 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-all flex items-center gap-2 font-medium"
                  >
                    <ExternalLink size={18} />
                    Buka
                  </a>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-2 italic">* Pastikan akses file Google Drive diatur ke "Siapa saja yang memiliki link" agar dapat diverifikasi.</p>
            </FormField>

            <FormField label="Tujuan Inovasi Daerah">
              <textarea 
                rows={4}
                value={localForm.profilInovasi.tujuan}
                onChange={(e) => handleProfilChange('tujuan', e.target.value)}
                placeholder="Apa tujuan dari inovasi ini?"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </FormField>

            <div className="space-y-4">
              <h3 className="font-bold text-stone-900">Manfaat yang Diperoleh</h3>
              <div className="grid gap-4">
                <FormField label="Bagi OPD / Instansi">
                  <textarea 
                    rows={2}
                    value={localForm.profilInovasi.manfaat.opd}
                    onChange={(e) => handleManfaatChange('opd', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                </FormField>
                <FormField label="Bagi Stakeholder">
                  <textarea 
                    rows={2}
                    value={localForm.profilInovasi.manfaat.stakeholder}
                    onChange={(e) => handleManfaatChange('stakeholder', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                </FormField>
                <FormField label="Bagi Masyarakat">
                  <textarea 
                    rows={2}
                    value={localForm.profilInovasi.manfaat.masyarakat}
                    onChange={(e) => handleManfaatChange('masyarakat', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                </FormField>
              </div>
            </div>

            <FormField label="Hasil Inovasi">
              <textarea 
                rows={4}
                value={localForm.profilInovasi.hasil}
                onChange={(e) => handleProfilChange('hasil', e.target.value)}
                placeholder="Apa hasil yang telah dicapai?"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </FormField>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-emerald-50 p-4 rounded-2xl flex items-start gap-3 text-emerald-800 text-sm mb-6">
              <Info className="shrink-0 mt-0.5" size={18} />
              <p>Mohon isi indikator di bawah ini dan lampirkan data dukung sesuai dengan ketentuan pada file PDF panduan.</p>
            </div>
            <div className="grid gap-8">
              {(Object.keys(INDICATOR_METADATA) as Array<keyof IndikatorInovasi>).map((key) => (
                <IndicatorField 
                  key={key}
                  field={key}
                  metadata={INDICATOR_METADATA[key]}
                  data={localForm.indikatorInovasi[key]}
                  onChange={handleIndikatorChange}
                  onUpload={handleFileUpload}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex gap-2">
          {activeTab === 'profil' ? (
            <button 
              onClick={() => setActiveTab('indikator')}
              className="px-6 py-3 rounded-full border border-stone-200 hover:bg-stone-50 text-stone-700 font-medium flex items-center gap-2 transition-all"
            >
              Lanjut ke Indikator
              <ChevronRight size={20} />
            </button>
          ) : (
            <button 
              onClick={() => setActiveTab('profil')}
              className="px-6 py-3 rounded-full border border-stone-200 hover:bg-stone-50 text-stone-700 font-medium flex items-center gap-2 transition-all"
            >
              <ChevronLeft size={20} />
              Kembali ke Profil
            </button>
          )}
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => handleSubmit('draft')}
            className="flex-1 md:flex-none px-6 py-3 rounded-full border border-stone-200 hover:bg-stone-50 text-stone-700 font-medium flex items-center justify-center gap-2 transition-all"
          >
            <Save size={20} />
            Simpan Draft
          </button>
          <button 
            onClick={() => handleSubmit('submitted')}
            className="flex-1 md:flex-none px-8 py-3 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-200"
          >
            Kirim Inovasi
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, required, description, children }: any) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-bold text-stone-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {description && <p className="text-xs text-stone-400 mb-1">{description}</p>}
      {children}
    </div>
  );
}

function IndicatorField({ field, metadata, data, onChange, onUpload }: { 
  field: string; 
  metadata: any; 
  data: IndicatorValue; 
  onChange: (f: string, s: keyof IndicatorValue, v: string) => void;
  onUpload: (f: string, file: File) => Promise<void>;
  key?: any;
}) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    await onUpload(field, file);
    setIsUploading(false);
  };

  return (
    <div className="p-6 rounded-3xl border border-stone-100 bg-stone-50/50 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h4 className="font-bold text-stone-900 flex items-center gap-2">
            {metadata.label}
          </h4>
          <p className="text-xs text-stone-500 mt-1">{metadata.deskripsi}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-2">
        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 text-xs">
          <p className="font-bold text-emerald-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FileText size={14} />
            Data Dukung
          </p>
          <p className="text-emerald-900/70 leading-relaxed">{metadata.dataDukung}</p>
        </div>
        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50 text-xs">
          <p className="font-bold text-amber-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Info size={14} />
            Keterangan/Contoh
          </p>
          <p className="text-amber-900/70 leading-relaxed">{metadata.keterangan}</p>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Nilai Indikator</label>
          <input 
            type="text" 
            value={data.value}
            onChange={(e) => onChange(field, 'value', e.target.value)}
            placeholder="Masukkan nilai indikator..."
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Data Dukung (PDF/Foto)</label>
            <div className="flex items-center gap-2">
              <label className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-stone-300 bg-white cursor-pointer hover:bg-stone-50 transition-all text-sm font-medium",
                isUploading && "opacity-50 cursor-not-allowed"
              )}>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".pdf,image/*" 
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                {isUploading ? (
                  <Loader2 className="animate-spin text-emerald-600" size={18} />
                ) : (
                  <Upload className="text-stone-400" size={18} />
                )}
                <span className="text-stone-600 truncate max-w-[150px]">
                  {data.fileName || 'Pilih File'}
                </span>
              </label>
              {data.fileUrl && (
                <a 
                  href={data.fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"
                >
                  <ExternalLink size={18} />
                </a>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Link Bukti Dukung</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                <input 
                  type="url" 
                  value={data.videoUrl || ''}
                  onChange={(e) => onChange(field, 'videoUrl', e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
