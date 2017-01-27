var gulp = require('gulp');
var notify = require('gulp-notify');
var growl = require('gulp-notify-growl');
var plumber = require('gulp-plumber');
var sass = require('gulp-ruby-sass');
var scsslint = require('gulp-scss-lint');
var ts = require('gulp-typescript');
var tslint = require('gulp-tslint');
var tslint_stylish = require('gulp-tslint-stylish');
var onError = function(err) {
    console.log(err);
};

var config = require('./gulp-config.json');

var tsPrj = ts.createProject(config.paths.tsconfig);

gulp.task('inject', function() {
    var wiredep = require('wiredep').stream;
    var inject = require('gulp-inject');
    var options = {
        bowerJson: require(config.paths.bower),
        directory: config.paths.dist.vendor,
        ignorePath: '../../public'
    };

    return gulp.src(config.paths.jadeFiles)
        .pipe(wiredep(options))
        .pipe(inject(gulp.src(config.paths.inject, {read: false}), {ignorePath: '/public'}))
        .pipe(gulp.dest(config.paths.views));
});

gulp.task('sasscompile', function () {
    var opts = {
        compass: true,
        sourcemap: false,
        style: 'expanded'
    };

    return sass('src/sass/**/*.scss', opts)
            .on('error', sass.logError)
        .pipe(gulp.dest(config.paths.dist.styles));
});

gulp.task('scss_lint', function () {
    var opts = {
        'config': 'lint.yml',
       'filePipeOutput': 'scss.json'
    };

    return gulp.src(config.paths.styles)
        .pipe(scsslint(opts))
        .pipe(scsslint.failReporter('E'))
        .pipe(gulp.dest('./reports/sass'));
});

gulp.task('tscompile', function() {
    return tsPrj.src()
        .pipe(tsPrj())
        .js.pipe(gulp.dest(config.paths.dist.scripts));
});

gulp.task('ts_lint', function () {
    return gulp.src(config.paths.ts)
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(tslint({
            formatter: 'verbose'
        }))
        .pipe(tslint.report({
            emitError: false,
            sort: true,
            bell: true
        }));
});

gulp.task('scripts', ['tscompile', 'ts_lint', 'inject']);
gulp.task('sass', ['scss_lint', 'sasscompile', 'inject']);
gulp.task('all', ['sass', 'scripts']);