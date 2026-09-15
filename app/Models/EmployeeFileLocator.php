<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;

class EmployeeFileLocator extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    const LOG_NAME = 'Employee File Locator';

    protected $table = 'employee_file_locator';

    protected $primaryKey = 'efr_id';

    protected $fillable = [
        'last_name',
        'first_name',
        'middle_name',
        'area',
        'status',
    ];

    public function getActivityUrl()
    {
        return route('employee-file-locator.index') . '?highlight_id=' . $this->getKey();
    }

    public function archiveMetadata(): MorphOne
    {
        return $this->morphOne(Archive::class, 'archivable');
    }
}