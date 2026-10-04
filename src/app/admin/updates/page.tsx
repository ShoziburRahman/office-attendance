import { ApkUploadForm } from "@/components/admin/ApkUploadForm";

export default function UpdatesPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">App Version Management</h1>
        <p className="text-gray-600 mt-2">
          Upload new Android APKs and manage the version released to employees.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ApkUploadForm />
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Release Guide</h2>
          <ul className="space-y-4 text-sm text-gray-600">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">1</span>
              <span>Increase <strong>versionCode</strong> in <code>android/app/build.gradle</code>.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">2</span>
              <span>Build the release APK via Android Studio.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">3</span>
              <span>Upload the APK and metadata using the form on the left.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">4</span>
              <span>Employees will be notified automatically on their next app start.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
