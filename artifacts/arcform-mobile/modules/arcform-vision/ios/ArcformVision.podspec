Pod::Spec.new do |s|
  s.name           = 'ArcformVision'
  s.version        = '1.0.0'
  s.summary        = 'On-device squat pose extraction for Arcform'
  s.description    = 'Samples local workout videos and extracts normalized body joints with Apple Vision.'
  s.author         = 'Arcform'
  s.homepage       = 'https://replit.com'
  s.platforms      = { :ios => '17.0' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFoundation', 'Vision'
  s.source_files = '**/*.{h,m,mm,swift}'
end