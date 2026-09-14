# Arcform TestFlight Release

Arcform is an Expo/React Native application with a local Swift Apple Vision
module. The tracked `ios/` directory is the Xcode project used for TestFlight.

## Current release identity

- Display name: **Arcform**
- Bundle identifier: **com.arcform.mobile**
- Version: **1.0.0**
- Build: **1**
- Minimum iOS version: **17.0**
- URL scheme: **arcform**

Confirm that `com.arcform.mobile` is available in the Apple Developer portal
before distributing the first build. If it is unavailable, choose the final
identifier once, update `app.json` and the release checker, and regenerate the
iOS project before creating the App Store Connect record.

## Release prerequisites

1. Use a Mac with a current Xcode release and CocoaPods installed.
2. Join the Apple Developer Program and accept all current agreements.
3. Make the Arcform Replit deployment public before testing the native app.
   The current deployment is password-protected; browser password protection
   blocks native API and Clerk requests. Do not embed a Replit bypass token in
   the app.
4. In App Store Connect, create a new iOS app with bundle ID
   `com.arcform.mobile`, SKU `arcform-ios`, and the Arcform app name.
5. Keep the production Clerk publishable key available locally. It is a public
   application identifier, but it should still be supplied through the local
   build environment rather than committed here.

## Prepare the project on a Mac

From the repository root:

```sh
pnpm install
pnpm --filter @workspace/arcform-mobile run prebuild:ios
cd artifacts/arcform-mobile/ios
pod install
open Arcform.xcworkspace
```

`pod install` must report the local `ArcformVision` pod. If it does not, stop:
the TestFlight app would only show the manual-review fallback.

Create an ignored file at `artifacts/arcform-mobile/.env.local`:

```dotenv
EXPO_PUBLIC_DOMAIN=entire-sparkling-opengroup.replit.app
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_production_key
```

If the deployment receives a custom domain, replace `EXPO_PUBLIC_DOMAIN` with
that hostname, without `https://`. Never commit `.env.local`.

Run the release preflight from the repository root:

```sh
pnpm --filter @workspace/arcform-mobile run check:ios-release
```

The check reads `.env.local` directly so it validates the same values Expo
bundles into an Xcode archive. It never prints the Clerk key.

The archive preflight intentionally fails unless:

- the Clerk key is a production `pk_live_` key,
- the production API responds directly without Replit Shield,
- `pod install` created `Arcform.xcworkspace` and `Podfile.lock`, and
- `Podfile.lock` contains `ArcformVision`.

For a configuration-only check before moving the project to a Mac, run:

```sh
pnpm --filter @workspace/arcform-mobile run check:ios-release:config
```

## Configure signing in Xcode

1. Open `Arcform.xcworkspace`, not `Arcform.xcodeproj`.
2. Select the **Arcform** project, then the **Arcform** application target.
3. Under **Signing & Capabilities**, enable automatic signing.
4. Select the Apple Developer team that owns `com.arcform.mobile`.
5. Confirm the Release configuration uses version **1.0.0**, build **1**, and
   deployment target **iOS 17.0**.
6. Select **Any iOS Device (arm64)** as the destination.

Do not commit certificates, provisioning profiles, `.p8`, `.p12`, or signing
credentials. Xcode manages them in the developer's account and keychain.

## Verify before archive

Install a Release build on a physical iPhone and confirm:

- Athlete and trainer sign-in reach the production Clerk tenant.
- Home, Training, Meal, Coach, Profile, and trainer flows load production API
  data.
- Camera and optional microphone permission prompts use Arcform's descriptions.
- Form can record, replay, analyze, discard, and rerecord a squat.
- Apple Vision displays pose results and rejects ambiguous multi-person clips.
- App relaunch preserves the signed-in session.

## Archive and upload

1. In Xcode, choose **Product → Archive**.
2. In Organizer, select the Arcform archive and choose **Distribute App**.
3. Choose **App Store Connect → Upload**.
4. Keep automatic signing selected, run validation, and upload.
5. In App Store Connect, wait for build processing to complete.
6. For export compliance, confirm the build does not use non-exempt encryption;
   this is also declared in the generated Info.plist.
7. Add the processed build to an internal TestFlight group and invite testers.

## Future builds

Every upload for version 1.0.0 must use a larger numeric `ios.buildNumber` in
`app.json`. Regenerate the iOS project and run the release preflight after each
version or build-number change. Increase `expo.version` when preparing a new
App Store version.