<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\LogsActivity;

class EmployeeFileLocator extends Model
{
    use HasFactory, LogsActivity;

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
        return route('employee-file-locator.index') . '?highlight_id=' . $this->id;
    }
}