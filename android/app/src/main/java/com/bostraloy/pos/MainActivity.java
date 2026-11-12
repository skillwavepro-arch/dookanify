package com.bostraloy.pos;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.res.AssetManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private static final String LOCAL_HOST = "appassets.bostraloy.local";
    private WebView webView;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            Window window = getWindow();
            if (window != null && Build.VERSION.SDK_INT >= 21) {
                window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
                window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
                window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                window.setStatusBarColor(Color.parseColor("#052e1e"));
                window.setNavigationBarColor(Color.parseColor("#FFFFFF"));
                if (Build.VERSION.SDK_INT >= 26) {
                    View decorView = window.getDecorView();
                    if (decorView != null) {
                        int flags = decorView.getSystemUiVisibility();
                        // 0x00000010 is View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR (API 26+)
                        flags |= 0x00000010;
                        decorView.setSystemUiVisibility(flags);
                    }
                }
            }
        } catch (Exception ignored) {
        }

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#FFFFFF"));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);

        webView.addJavascriptInterface(this, "AndroidBridge");

        final AssetManager assetManager = getAssets();

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (url != null && LOCAL_HOST.equalsIgnoreCase(url.getHost())) {
                    String path = url.getPath();
                    if (path == null || path.isEmpty() || "/".equals(path)) {
                        path = "index.html";
                    } else if (path.startsWith("/")) {
                        path = path.substring(1);
                    }
                    try {
                        InputStream stream = assetManager.open(path);
                        String mime = guessMimeType(path);
                        return new WebResourceResponse(mime, "UTF-8", stream);
                    } catch (IOException e) {
                        try {
                            InputStream fallback = assetManager.open("index.html");
                            return new WebResourceResponse("text/html", "UTF-8", fallback);
                        } catch (IOException ignored) {
                            return null;
                        }
                    }
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url == null) return false;
                if (url.startsWith("tel:") ||
                    url.startsWith("mailto:") ||
                    url.startsWith("whatsapp:") ||
                    url.startsWith("https://wa.me/") ||
                    url.startsWith("http://wa.me/")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                    } catch (Exception ignored) {
                    }
                    return true;
                }
                return false;
            }
        });

        setContentView(webView);
        webView.loadUrl("https://" + LOCAL_HOST + "/index.html");
    }

    @JavascriptInterface
    public boolean downloadPdfBase64(String base64Pdf, String fileName) {
        try {
            byte[] pdfBytes = Base64.decode(base64Pdf, Base64.DEFAULT);
            ContentValues values = new ContentValues();
            values.put("_display_name", fileName);
            values.put("mime_type", "application/pdf");
            values.put("relative_path", "Download/");
            Uri collection = Uri.parse("content://media/external/downloads");
            Uri itemUri = getContentResolver().insert(collection, values);
            if (itemUri == null) {
                return false;
            }
            OutputStream os = getContentResolver().openOutputStream(itemUri);
            if (os == null) {
                return false;
            }
            os.write(pdfBytes);
            os.flush();
            os.close();
            Toast.makeText(this, "Saved: Downloads/" + fileName, Toast.LENGTH_LONG).show();
            try {
                Intent viewIntent = new Intent(Intent.ACTION_VIEW);
                viewIntent.setDataAndType(itemUri, "application/pdf");
                viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(viewIntent);
            } catch (Exception ignored) {
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @JavascriptInterface
    public boolean sharePdfBase64(String base64Pdf, String fileName) {
        try {
            byte[] pdfBytes = Base64.decode(base64Pdf, Base64.DEFAULT);
            ContentValues values = new ContentValues();
            values.put("_display_name", fileName);
            values.put("mime_type", "application/pdf");
            values.put("relative_path", "Download/");
            Uri collection = Uri.parse("content://media/external/downloads");
            Uri itemUri = getContentResolver().insert(collection, values);
            if (itemUri == null) {
                return false;
            }
            OutputStream os = getContentResolver().openOutputStream(itemUri);
            if (os == null) {
                return false;
            }
            os.write(pdfBytes);
            os.flush();
            os.close();
            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("application/pdf");
            shareIntent.putExtra(Intent.EXTRA_STREAM, itemUri);
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(shareIntent, fileName);
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(chooser);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private String guessMimeType(String path) {
        String lower = path.toLowerCase();
        if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".json") || lower.endsWith(".webmanifest")) return "application/json";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".ico")) return "image/x-icon";
        if (lower.endsWith(".ttf")) return "font/ttf";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".woff")) return "font/woff";
        return "application/octet-stream";
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}

