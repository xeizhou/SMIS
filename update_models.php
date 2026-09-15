<?php

$models = [
    'Delivery.php',
    'PoLetterMonitoring.php',
    'RrspMonitoring.php',
    'RegspiMonitoring.php',
    'BonaVidaMonitoring.php',
    'PirMonitoring.php',
    'Clearance.php',
    'EmployeeFileLocator.php'
];

foreach ($models as $model) {
    $path = "c:/Users/Cedric/Herd/SMIS/app/Models/" . $model;
    if (!file_exists($path)) {
        echo "File not found: $path\n";
        continue;
    }

    $content = file_get_contents($path);

    // Add SoftDeletes import if not present
    if (strpos($content, 'use Illuminate\Database\Eloquent\SoftDeletes;') === false) {
        $content = preg_replace('/(use Illuminate\\\\Database\\\\Eloquent\\\\Model;)/', "$1\nuse Illuminate\\Database\\Eloquent\\SoftDeletes;", $content);
    }

    // Add MorphOne import if not present
    if (strpos($content, 'use Illuminate\Database\Eloquent\Relations\MorphOne;') === false) {
        $content = preg_replace('/(use Illuminate\\\\Database\\\\Eloquent\\\\Model;)/', "$1\nuse Illuminate\\Database\\Eloquent\\Relations\\MorphOne;", $content);
    }

    // Add SoftDeletes to the trait uses inside class
    if (preg_match('/use HasFactory([^;]+);/', $content, $matches)) {
        if (strpos($matches[1], 'SoftDeletes') === false) {
            $newUses = 'use HasFactory' . $matches[1] . ', SoftDeletes;';
            $content = str_replace($matches[0], $newUses, $content);
        }
    } else {
        // Just in case it doesn't have HasFactory
        $content = preg_replace('/(class \w+ extends Model\n\{)/', "$1\n    use SoftDeletes;\n", $content);
    }

    // Add archiveMetadata method if not present
    if (strpos($content, 'function archiveMetadata') === false) {
        $method = "\n    public function archiveMetadata(): MorphOne\n    {\n        return \$this->morphOne(Archive::class, 'archivable');\n    }\n";
        $content = preg_replace('/(\}[ \n\r]*)$/', $method . "$1", $content);
    }

    file_put_contents($path, $content);
    echo "Updated $model\n";
}
