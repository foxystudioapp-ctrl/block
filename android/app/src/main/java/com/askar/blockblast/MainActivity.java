package com.askar.blockblast;

import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.annotation.SuppressLint;

import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();

        // Apply force dark to the WebView so app dark mode looks like system dark mode
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                // Sistemin font ayarını yoksayarak %100'e sabitler
                webView.getSettings().setTextZoom(100);
            }
            if (webView != null && WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
                WebSettingsCompat.setAlgorithmicDarkeningAllowed(webView.getSettings(), true);
            } else if (webView != null && WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
                WebSettingsCompat.setForceDark(webView.getSettings(), WebSettingsCompat.FORCE_DARK_AUTO);
            }
        } catch (Exception e) {
            // Gracefully handle if WebView feature not available
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    private void hideSystemUI() {
        WindowInsetsControllerCompat windowInsetsController =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (windowInsetsController == null) {
            return;
        }
        // Çubuklar ekranın kenarından kaydırıldığında geçici olarak görünür
        windowInsetsController.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );
        // Hem bildirim çubuğunu hem de alt menü çubuğunu gizler
        windowInsetsController.hide(WindowInsetsCompat.Type.systemBars());
    }
}
