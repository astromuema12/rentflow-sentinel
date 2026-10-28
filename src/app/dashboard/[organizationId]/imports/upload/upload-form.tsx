"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

export function UploadForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please select a file");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `/api/organizations/${organizationId}/imports/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      router.push(`/dashboard/${organizationId}/imports/${data.batchId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="upload-form">
      <div className="upload-area">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          id="file-upload"
        />
        <label htmlFor="file-upload" className="upload-label">
          <Upload size={24} aria-hidden="true" />
          <span>
            {file ? file.name : "Choose a CSV file or drag and drop"}
          </span>
        </label>
      </div>
      {error && <p className="error-message">{error}</p>}
      <button
        type="submit"
        className="button button-primary"
        disabled={!file || uploading}
      >
        {uploading ? "Uploading..." : "Upload and import"}
      </button>
    </form>
  );
}
