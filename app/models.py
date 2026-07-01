from pydantic import BaseModel
from typing import Any, Optional


# ─── Auth ──────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: str
    username: str
    nama: str
    reg: str = ""
    role: str
    status: str
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ─── Users ─────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    password: str
    nama: str
    role: str
    reg: str = ""


class UserUpdate(BaseModel):
    nama: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    reg: Optional[str] = None
    status: Optional[str] = None


# ─── Auditors ──────────────────────────────────────────────────────────────

class AuditorOut(BaseModel):
    id: int
    nama: str
    reg: str
    jk: str


class AuditorCreate(BaseModel):
    nama: str
    reg: str = ""
    jk: str


class AuditorUpdate(BaseModel):
    nama: Optional[str] = None
    reg: Optional[str] = None
    jk: Optional[str] = None


# ─── Registrations ─────────────────────────────────────────────────────────

class RegistrationOut(BaseModel):
    id: str
    nama_pu: str
    nama_usaha: str = ""
    jenis_produk: str
    tanggal_daftar: str = ""
    tanggal_audit: str = ""
    lead_auditor: Optional[int] = None
    auditor: Optional[int] = None
    auditor2: Optional[int] = None
    auditor3: Optional[int] = None
    observer: str = ""
    alamat: str = ""
    agama_pemilik: str = "Islam"
    jenis_pendaftaran: str = "Pengajuan Baru"
    nama_pabrik: str = ""
    alamat_pabrik: str = ""
    fasilitas_kota: str = ""
    fasilitas_negara: str = "Indonesia"
    penyelia_halal: str = ""
    penyelia_no_ktp: str = ""
    penyelia_no_sertifikat: str = ""
    penyelia_no_sk: str = ""
    penyelia_no_kontak: str = ""
    created_at: str = ""
    updated_at: str = ""


class RegistrationCreate(BaseModel):
    id: str
    nama_pu: str
    nama_usaha: str = ""
    jenis_produk: str
    tanggal_daftar: str = ""
    tanggal_audit: str = ""
    lead_auditor: Optional[int] = None
    auditor: Optional[int] = None
    auditor2: Optional[int] = None
    auditor3: Optional[int] = None
    observer: str = ""
    alamat: str = ""
    agama_pemilik: str = "Islam"
    jenis_pendaftaran: str = "Pengajuan Baru"
    nama_pabrik: str = ""
    alamat_pabrik: str = ""
    fasilitas_kota: str = ""
    fasilitas_negara: str = "Indonesia"
    penyelia_halal: str = ""
    penyelia_no_ktp: str = ""
    penyelia_no_sertifikat: str = ""
    penyelia_no_sk: str = ""
    penyelia_no_kontak: str = ""


class RegistrationUpdate(BaseModel):
    nama_pu: Optional[str] = None
    nama_usaha: Optional[str] = None
    jenis_produk: Optional[str] = None
    tanggal_daftar: Optional[str] = None
    tanggal_audit: Optional[str] = None
    lead_auditor: Optional[int] = None
    auditor: Optional[int] = None
    auditor2: Optional[int] = None
    auditor3: Optional[int] = None
    observer: Optional[str] = None
    alamat: Optional[str] = None
    agama_pemilik: Optional[str] = None
    jenis_pendaftaran: Optional[str] = None
    nama_pabrik: Optional[str] = None
    alamat_pabrik: Optional[str] = None
    fasilitas_kota: Optional[str] = None
    fasilitas_negara: Optional[str] = None
    penyelia_halal: Optional[str] = None
    penyelia_no_ktp: Optional[str] = None
    penyelia_no_sertifikat: Optional[str] = None
    penyelia_no_sk: Optional[str] = None
    penyelia_no_kontak: Optional[str] = None


# ─── Reports ───────────────────────────────────────────────────────────────

class ReportOut(BaseModel):
    id: str
    registration_id: str
    lulus: bool
    verdict: str = "lulus"
    status: str
    data_json: dict
    created_at: str
    updated_at: str


class ReportSave(BaseModel):
    lulus: bool
    verdict: str = "lulus"
    data_json: dict
    status: str = "draft"


# ─── Photos ────────────────────────────────────────────────────────────────

class PhotoOut(BaseModel):
    id: int
    reg_id: str
    category: str
    filename: str
    original_name: str
    mime_type: str
    file_size: int
    metadata_json: dict
    created_at: str


class PhotoMetadataUpdate(BaseModel):
    metadata_json: dict


# ─── App State ─────────────────────────────────────────────────────────────

class StateOut(BaseModel):
    key: str
    value: Any


class StateSet(BaseModel):
    value: Any
