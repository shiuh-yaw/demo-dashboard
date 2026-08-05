plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.fireblocks.connect"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.fireblocks.poc.androidexample"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    // Chrome Custom Tabs — the secure in-app browser the flow opens in.
    implementation("androidx.browser:browser:1.8.0")
}
