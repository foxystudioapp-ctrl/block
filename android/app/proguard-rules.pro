# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ============================================================
# R8/Minify keep rules — Bloxy (Capacitor + plugins)
# Bunlar reflection/annotation ile çalışan sınıfları R8 silmesin/yeniden adlandırmasın diye.
# ============================================================

# --- Capacitor çekirdeği + eklenti köprüsü ---
-keep public class * extends com.getcapacitor.Plugin
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public <methods>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
}
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }

# --- WebView JS köprüsü (@JavascriptInterface) ---
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# --- Cordova (Capacitor bazı Cordova köprülerini kullanır) ---
-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**

# --- Topluluk/üçüncü taraf eklentiler (AdMob, RevenueCat, Google/Apple Sign-In) ---
-keep class com.getcapacitor.community.** { *; }
-keep class io.capawesome.** { *; }
-keep class com.revenuecat.** { *; }
-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.revenuecat.**

# --- Firebase (genelde kendi consumer kuralını getirir; güvenlik için) ---
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# --- Reflection/generic için nitelikleri koru ---
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod, JavascriptInterface
