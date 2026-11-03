package com.vaivaii.mg30studio;

import android.content.Context;
import android.media.AudioDeviceInfo;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.os.Build;

import java.util.Locale;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Read-only USB output discovery for the MG-30 Studio reamp investigation.
 *
 * Deliberately separate from MG30AudioPlugin: this class does not touch the
 * stable AudioRecord capture path and does not start or stop audio playback.
 */
@CapacitorPlugin(name = "MG30AudioOutput")
public class MG30AudioOutputPlugin extends Plugin {

    @PluginMethod
    public void inspectOutputDevices(PluginCall call) {
        AudioManager manager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        JSArray devices = new JSArray();
        boolean usbOutputFound = false;
        boolean mg30OutputFound = false;

        if (manager != null) {
            for (AudioDeviceInfo device : manager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)) {
                boolean isUsb = isUsbOutput(device);
                String productName = device.getProductName() == null ? "" : device.getProductName().toString();
                boolean isMg30 = isUsb && isMg30ProductName(productName);
                usbOutputFound = usbOutputFound || isUsb;
                mg30OutputFound = mg30OutputFound || isMg30;

                JSObject item = new JSObject();
                item.put("id", device.getId());
                item.put("name", productName.isEmpty() ? "Audio output " + device.getId() : productName);
                item.put("type", device.getType());
                item.put("typeName", typeName(device.getType()));
                item.put("isUsb", isUsb);
                item.put("isMg30", isMg30);
                item.put("sampleRates", toJsArray(device.getSampleRates()));
                item.put("channelCounts", toJsArray(device.getChannelCounts()));

                JSArray encodings = new JSArray();
                if (Build.VERSION.SDK_INT >= 31) {
                    for (int encoding : device.getEncodings()) encodings.put(encoding);
                }
                item.put("encodings", encodings);
                item.put("supports24BitPacked", Build.VERSION.SDK_INT >= 31
                    && contains(device.getEncodings(), AudioFormat.ENCODING_PCM_24BIT_PACKED));
                devices.put(item);
            }
        }

        JSObject result = new JSObject();
        result.put("native", true);
        result.put("androidApi", Build.VERSION.SDK_INT);
        result.put("usbOutputFound", usbOutputFound);
        result.put("mg30OutputFound", mg30OutputFound);
        result.put("devices", devices);
        result.put("note", "Read-only output endpoint discovery. No audio is played; endpoint visibility does not prove that a stream reaches the MG-30. Reamp still requires a verified USB playback and full-duplex device test.");
        call.resolve(result);
    }

    private static boolean isUsbOutput(AudioDeviceInfo device) {
        int type = device.getType();
        return type == AudioDeviceInfo.TYPE_USB_DEVICE
            || type == AudioDeviceInfo.TYPE_USB_ACCESSORY
            || (Build.VERSION.SDK_INT >= 26 && type == AudioDeviceInfo.TYPE_USB_HEADSET);
    }

    private static boolean isMg30ProductName(String productName) {
        String normalized = productName == null ? "" : productName.toLowerCase(Locale.ROOT);
        return normalized.contains("mg-30") || normalized.contains("nux");
    }

    private static String typeName(int type) {
        switch (type) {
            case AudioDeviceInfo.TYPE_USB_DEVICE: return "USB device output";
            case AudioDeviceInfo.TYPE_USB_HEADSET: return "USB headset output";
            case AudioDeviceInfo.TYPE_BUILTIN_SPEAKER: return "Speaker bawaan";
            case AudioDeviceInfo.TYPE_WIRED_HEADPHONES: return "Headphone berkabel";
            case AudioDeviceInfo.TYPE_WIRED_HEADSET: return "Headset berkabel";
            case AudioDeviceInfo.TYPE_BLUETOOTH_A2DP: return "Bluetooth A2DP";
            default: return "Audio output type " + type;
        }
    }

    private static JSArray toJsArray(int[] values) {
        JSArray array = new JSArray();
        for (int value : values) array.put(value);
        return array;
    }

    private static boolean contains(int[] values, int target) {
        for (int value : values) if (value == target) return true;
        return false;
    }
}
