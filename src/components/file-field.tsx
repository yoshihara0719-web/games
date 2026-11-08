"use client";

import { useState } from "react";

export function FileField({
  label,
  name,
  accept,
  required = false,
  empty,
}: {
  label: string;
  name: string;
  accept: string;
  required?: boolean;
  empty: string;
}) {
  const [filename, setFilename] = useState(empty);
  return (
    <label>
      {label}
      <span className="file-row">
        <input
          className="file-input"
          name={name}
          type="file"
          accept={accept}
          required={required}
          onChange={(event) => {
            const file = event.target.files?.[0];
            setFilename(file ? file.name : empty);
          }}
        />
        <span className="file-button">ファイルを選ぶ</span>
        <span className="file-name">{filename}</span>
      </span>
    </label>
  );
}
