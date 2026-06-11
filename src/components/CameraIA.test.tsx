import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CameraIA from "./CameraIA";

describe("CameraIA component", () => {
  const mockOnUpdateInventory = vi.fn();
  const originalFileReader = global.FileReader;
  const originalGetUserMedia = navigator.mediaDevices?.getUserMedia;

  beforeEach(() => {
    mockOnUpdateInventory.mockClear();
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) },
      configurable: true,
    });
    Object.defineProperty(HTMLVideoElement.prototype, "play", {
      value: vi.fn().mockResolvedValue(undefined),
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.FileReader = originalFileReader;
    if (originalGetUserMedia) {
      Object.defineProperty(globalThis.navigator, "mediaDevices", {
        value: { getUserMedia: originalGetUserMedia },
        configurable: true,
      });
    }
  });

  it("renders the Camera IA header and controls", () => {
    render(<CameraIA onUpdateInventory={mockOnUpdateInventory} />);
    expect(screen.getByRole("heading", { name: /Câmera IA/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ligar Webcam/i })).toBeInTheDocument();
    expect(screen.getByText(/Upload Foto/i)).toBeInTheDocument();
  });

  it("starts webcam streaming when the user clicks the button", async () => {
    render(<CameraIA onUpdateInventory={mockOnUpdateInventory} />);
    await userEvent.click(screen.getByRole("button", { name: /Ligar Webcam/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Desligar Câmera/i })).toBeInTheDocument();
    });
    expect(navigator.mediaDevices?.getUserMedia).toHaveBeenCalled();
  });

  it("uploads an image file and adds a thumbnail to the gallery", async () => {
    const file = new File(["dummy content"], "test-image.jpg", { type: "image/jpeg" });

    const fileReaderMock = {
      readAsDataURL: vi.fn().mockImplementation(function () {
        if (this.onloadend) {
          this.result = "data:image/jpeg;base64,TEST";
          this.onloadend();
        }
      }),
      result: "",
      onloadend: null as (() => void) | null,
    } as any;

    const FileReaderMock = vi.fn(() => fileReaderMock);
    global.FileReader = FileReaderMock as any;

    render(<CameraIA onUpdateInventory={mockOnUpdateInventory} />);

    const fileInput = screen.getByLabelText(/Upload Foto/i) as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getAllByAltText("thumb").length).toBeGreaterThan(0);
    });
  });
});
