from flask import Flask, render_template, request, jsonify
import os
import base64
import json
import pandas as pd
import joblib
import librosa
import numpy as np

app = Flask(__name__)

# ==============================
# MODEL PATH
# ==============================

MODEL_PATH = "features/models/random_forest_model.pkl"

model = joblib.load(MODEL_PATH)


# ==============================
# FEATURE EXTRACTION
# ==============================

def extract_features(file_path):

    # Load audio
    y, sr = librosa.load(file_path, sr=None)

    # 1. RMS Energy
    rms = np.mean(
        librosa.feature.rms(y=y)
    )

    # 2. Zero Crossing Rate
    zcr = np.mean(
        librosa.feature.zero_crossing_rate(y)
    )

    # 3. MFCC
    mfcc = librosa.feature.mfcc(
        y=y,
        sr=sr,
        n_mfcc=13
    )

    mfcc_mean = np.mean(
        mfcc,
        axis=1
    )

    # 4. Spectral Features
    spectral_centroid = np.mean(
        librosa.feature.spectral_centroid(
            y=y,
            sr=sr
        )
    )

    spectral_bandwidth = np.mean(
        librosa.feature.spectral_bandwidth(
            y=y,
            sr=sr
        )
    )

    spectral_rolloff = np.mean(
        librosa.feature.spectral_rolloff(
            y=y,
            sr=sr
        )
    )

    # 5. Spectral Contrast
    spectral_contrast = librosa.feature.spectral_contrast(
        y=y,
        sr=sr
    )

    contrast_mean = np.mean(
        spectral_contrast,
        axis=1
    )

    # Combine all 25 features
    features = np.concatenate([
        [rms],
        [zcr],
        [spectral_centroid],
        [spectral_bandwidth],
        [spectral_rolloff],
        contrast_mean,
        mfcc_mean
    ])

    return features


# ==============================
# FEATURE NAMES
# ==============================

feature_columns = [
    "rms",
    "zcr",
    "spectral_centroid",
    "spectral_bandwidth",
    "spectral_rolloff"
]

feature_columns += [
    f"contrast_{i}"
    for i in range(1, 8)
]

feature_columns += [
    f"mfcc_{i}"
    for i in range(1, 14)
]


# ==============================
# SIGNAL & DSP VISUALIZATION HELPER
# ==============================

def compute_signal_and_dsp_details(file_path, features):
    """
    Computes downsampled waveform, FFT spectrum, structured DSP metrics,
    and base64-encoded audio for dashboard visualization without altering
    the machine learning feature pipeline.
    """
    y, sr = librosa.load(file_path, sr=None)
    duration = float(len(y) / sr)

    # 1. Waveform Decimation (1200 data points for responsive 60fps chart rendering)
    target_waveform_pts = 1200
    step = max(1, len(y) // target_waveform_pts)
    waveform_y = [round(float(v), 4) for v in y[::step][:target_waveform_pts]]
    waveform_t = [round(float(t), 3) for t in np.linspace(0, duration, len(waveform_y))]

    # 2. FFT Power Spectrum Analysis using NumPy with peak-preserving bin pooling
    fft_vals = np.abs(np.fft.rfft(y))
    freqs = np.fft.rfftfreq(len(y), 1.0 / sr)
    target_fft_pts = 600
    num_bins = min(target_fft_pts, len(fft_vals))
    bin_size = len(fft_vals) / num_bins
    fft_freqs = []
    mag_sub = []
    for i in range(num_bins):
        start_idx = int(i * bin_size)
        end_idx = int((i + 1) * bin_size)
        if start_idx >= end_idx:
            end_idx = start_idx + 1
        chunk_vals = fft_vals[start_idx:end_idx]
        max_idx = int(np.argmax(chunk_vals))
        peak_freq = freqs[start_idx + max_idx]
        fft_freqs.append(round(float(peak_freq), 1))
        mag_sub.append(float(chunk_vals[max_idx]))

    mag_sub = np.array(mag_sub)
    max_mag = float(np.max(mag_sub)) if len(mag_sub) > 0 and np.max(mag_sub) > 0 else 1.0
    # Normalized dB relative to peak (floor at -80 dB)
    mag_db = [round(float(v), 2) for v in (20 * np.log10(np.maximum(mag_sub / max_mag, 1e-4)))]
    dominant_freq = round(float(freqs[np.argmax(fft_vals)]), 1)

    # 3. Structured DSP Feature Dictionary & Exact 25 Feature Telemetry
    contrast_vals = [round(float(v), 3) for v in features[5:12]]
    mfcc_vals = [round(float(v), 3) for v in features[12:25]]

    contrast_labels = [
        "Band 1 (0-200 Hz)",
        "Band 2 (200-400 Hz)",
        "Band 3 (400-800 Hz)",
        "Band 4 (800-1.6k)",
        "Band 5 (1.6k-3.2k)",
        "Band 6 (3.2k-6.4k)",
        "Band 7 (>6.4k)"
    ]
    mfcc_labels = [f"MFCC {i+1}" for i in range(13)]

    # Actual Extracted DSP Feature Groups (Grouped into Time Domain, Frequency Domain, Spectral Contrast, MFCC)
    time_domain = [
        {
            "name": "RMS Energy",
            "key": "rms",
            "value": f"{float(features[0]):.4f}",
            "raw": float(features[0]),
            "unit": "",
            "description": "Root Mean Square signal energy"
        },
        {
            "name": "Zero Crossing Rate",
            "key": "zcr",
            "value": f"{float(features[1]):.4f}",
            "raw": float(features[1]),
            "unit": "",
            "description": "Rate of sign-changes along the signal"
        }
    ]

    frequency_domain = [
        {
            "name": "Spectral Centroid",
            "key": "spectral_centroid",
            "value": f"{float(features[2]):.2f}",
            "raw": float(features[2]),
            "unit": "Hz",
            "description": "Center of mass / brightness of acoustic spectrum"
        },
        {
            "name": "Spectral Bandwidth",
            "key": "spectral_bandwidth",
            "value": f"{float(features[3]):.2f}",
            "raw": float(features[3]),
            "unit": "Hz",
            "description": "Width / spread of spectral distribution around centroid"
        },
        {
            "name": "Spectral Rolloff",
            "key": "spectral_rolloff",
            "value": f"{float(features[4]):.2f}",
            "raw": float(features[4]),
            "unit": "Hz",
            "description": "Frequency below which 85% of spectral energy lies"
        }
    ]

    spectral_contrast_list = [
        {
            "name": f"Contrast {i+1}",
            "key": f"contrast_{i+1}",
            "band": contrast_labels[i],
            "value": f"{float(features[5+i]):.3f}",
            "raw": float(features[5+i]),
            "unit": "dB",
            "description": f"Octave sub-band difference ({contrast_labels[i]})"
        }
        for i in range(7)
    ]

    mfcc_list = [
        {
            "name": f"MFCC {i+1}",
            "key": f"mfcc_{i+1}",
            "value": f"{float(features[12+i]):.3f}",
            "raw": float(features[12+i]),
            "unit": "",
            "description": "Log Energy" if i == 0 else f"Cepstral coefficient {i+1}"
        }
        for i in range(13)
    ]

    dsp_dict = {
        "rms": round(float(features[0]), 5),
        "zcr": round(float(features[1]), 5),
        "spectral_centroid": round(float(features[2]), 2),
        "spectral_bandwidth": round(float(features[3]), 2),
        "spectral_rolloff": round(float(features[4]), 2),
        "spectral_contrast": contrast_vals,
        "spectral_contrast_labels": contrast_labels,
        "mfcc": mfcc_vals,
        "mfcc_labels": mfcc_labels,
        "all_features": {col: round(float(val), 5) for col, val in zip(feature_columns, features)},
        "time_domain": time_domain,
        "frequency_domain": frequency_domain,
        "spectral_contrast_list": spectral_contrast_list,
        "mfcc_list": mfcc_list
    }

    metadata = {
        "duration": round(duration, 2),
        "sample_rate": int(sr),
        "num_samples": int(len(y)),
        "peak_amplitude": round(float(np.max(np.abs(y))), 4),
        "dominant_frequency": dominant_freq
    }

    # 4. Audio Base64 Encoding for instant in-browser playback
    with open(file_path, "rb") as f:
        audio_b64 = base64.b64encode(f.read()).decode("ascii")

    return {
        "waveform": {"time": waveform_t, "amplitude": waveform_y},
        "fft": {"freq": fft_freqs, "mag_db": mag_db, "dominant_freq": dominant_freq},
        "dsp": dsp_dict,
        "metadata": metadata,
        "audio_base64": audio_b64
    }


# ==============================
# SAMPLE BENCHMARK PRESETS
# ==============================

SAMPLE_BENCHMARKS = {
    "normal": "fan/test/section_00_source_test_normal_0000_n_B.wav",
    "fault": "fan/test/section_00_source_test_anomaly_0000_n_B.wav",
    "anomaly": "fan/test/section_00_source_test_anomaly_0000_n_B.wav"
}


# ==============================
# HOME PAGE
# ==============================

@app.route("/")
def home():

    return render_template(
        "index.html"
    )


# ==============================
# QUICK DEMO ROUTE
# ==============================

@app.route("/demo/<sample_type>")
def demo(sample_type):
    if sample_type not in SAMPLE_BENCHMARKS:
        return "Sample benchmark not found", 404

    file_path = SAMPLE_BENCHMARKS[sample_type]
    if not os.path.exists(file_path):
        return f"Sample file {file_path} not found on server", 404

    # Extract features using exact pipeline
    features = extract_features(file_path)

    # Convert to DataFrame
    sample = pd.DataFrame(
        [features],
        columns=feature_columns
    )

    # Prediction
    prediction = model.predict(sample)[0]

    # Probabilities
    probabilities = model.predict_proba(sample)[0]
    classes = model.classes_

    probability_dict = {}
    for class_name, probability in zip(classes, probabilities):
        probability_dict[class_name] = round(probability * 100, 2)

    # Signal and DSP telemetry
    signal_info = compute_signal_and_dsp_details(file_path, features)
    filename = os.path.basename(file_path)

    return render_template(
        "result.html",
        prediction=prediction,
        probabilities=probability_dict,
        dsp_features=signal_info["dsp"],
        waveform_data=signal_info["waveform"],
        fft_data=signal_info["fft"],
        audio_metadata=signal_info["metadata"],
        audio_base64=signal_info["audio_base64"],
        filename=filename,
        is_sample=True,
        time_domain=signal_info["dsp"]["time_domain"],
        frequency_domain=signal_info["dsp"]["frequency_domain"],
        spectral_contrast_list=signal_info["dsp"]["spectral_contrast_list"],
        mfcc_list=signal_info["dsp"]["mfcc_list"]
    )


# ==============================
# PREDICTION
# ==============================

@app.route("/predict", methods=["POST"])
def predict():

    if "audio" not in request.files:

        return "No audio file uploaded."

    audio = request.files["audio"]

    if audio.filename == "":

        return "Please select a WAV file."

    # Create temporary upload folder
    upload_folder = "uploads"

    os.makedirs(
        upload_folder,
        exist_ok=True
    )

    file_path = os.path.join(
        upload_folder,
        audio.filename
    )

    audio.save(file_path)

    try:
        # Extract features
        features = extract_features(
            file_path
        )

        # Convert to DataFrame
        sample = pd.DataFrame(
            [features],
            columns=feature_columns
        )

        # Prediction
        prediction = model.predict(
            sample
        )[0]

        # Probabilities
        probabilities = model.predict_proba(
            sample
        )[0]

        classes = model.classes_

        probability_dict = {}

        for class_name, probability in zip(
            classes,
            probabilities
        ):

            probability_dict[class_name] = round(
                probability * 100,
                2
            )

        # Extract signal visualization and DSP details
        signal_info = compute_signal_and_dsp_details(file_path, features)
    finally:
        # Remove uploaded file safely
        if os.path.exists(file_path):
            os.remove(file_path)

    # Support AJAX / JSON requests
    if request.headers.get("X-Requested-With") == "XMLHttpRequest" or request.args.get("format") == "json":
        return jsonify({
            "status": "success",
            "prediction": prediction,
            "probabilities": probability_dict,
            "dsp_features": signal_info["dsp"],
            "waveform_data": signal_info["waveform"],
            "fft_data": signal_info["fft"],
            "audio_metadata": signal_info["metadata"],
            "audio_base64": signal_info["audio_base64"],
            "filename": audio.filename
        })

    return render_template(
        "result.html",
        prediction=prediction,
        probabilities=probability_dict,
        dsp_features=signal_info["dsp"],
        waveform_data=signal_info["waveform"],
        fft_data=signal_info["fft"],
        audio_metadata=signal_info["metadata"],
        audio_base64=signal_info["audio_base64"],
        filename=audio.filename,
        is_sample=False,
        time_domain=signal_info["dsp"]["time_domain"],
        frequency_domain=signal_info["dsp"]["frequency_domain"],
        spectral_contrast_list=signal_info["dsp"]["spectral_contrast_list"],
        mfcc_list=signal_info["dsp"]["mfcc_list"]
    )


# ==============================
# START FLASK
# ==============================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"Starting server on http://127.0.0.1:{port}")
    app.run(
        host="0.0.0.0",
        port=port,
        debug=True
    )